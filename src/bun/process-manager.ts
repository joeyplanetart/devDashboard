import { randomUUID } from "node:crypto";
import { existsSync, statSync } from "node:fs";
import type {
	ActionResult,
	AppConfig,
	AppInput,
	AppStatus,
	FailureInfo,
	LogLine,
	LogStream,
	RuntimeState,
	ToastPayload,
} from "../shared/types";
import { loadApps, saveApps } from "./config";
import { LogBuffer } from "./logs";
import { checkPort, detectPortFromLine, getPortOwner, isPortListening } from "./ports";

const READY_TIMEOUT_MS = 30_000;
const PORT_READY_INTERVAL_MS = 500;
const NO_PORT_GRACE_MS = 1_500;
const LOG_FLUSH_INTERVAL_MS = 100;
const DEBUG = Boolean(process.env.DEV_DASHBOARD_DEBUG);

type Managed = {
	config: AppConfig;
	status: AppStatus;
	portReady: boolean;
	proc?: Bun.Subprocess;
	pid?: number;
	effectivePort?: number;
	startedAt?: number;
	exitCode?: number | null;
	failure?: FailureInfo;
	expectedExit: boolean;
	runId: number;
	logs: LogBuffer;
	pending: LogLine[];
	readyTimer?: ReturnType<typeof setInterval>;
};

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeInput(input: AppInput): { ok: true; value: AppInput } | { ok: false; error: string } {
	const name = input.name?.trim() ?? "";
	const rawCwd = input.cwd?.trim() ?? "";
	const cwd =
		rawCwd.length > 1 ? rawCwd.replace(/\/+$/, "") : rawCwd;
	const command = input.command?.trim() ?? "";

	if (!name) return { ok: false, error: "请填写应用名称" };
	if (!cwd) return { ok: false, error: "请选择工作目录" };
	if (!command) return { ok: false, error: "请填写启动命令" };

	if (!existsSync(cwd)) return { ok: false, error: "工作目录不存在" };
	try {
		if (!statSync(cwd).isDirectory()) {
			return { ok: false, error: "工作目录不是一个目录" };
		}
	} catch {
		return { ok: false, error: "无法访问工作目录" };
	}

	if (!command) return { ok: false, error: "请填写启动命令" };

	let port: number | undefined;
	if (input.port !== undefined && input.port !== null) {
		const value = Number(input.port);
		if (!Number.isInteger(value) || value < 1 || value > 65535) {
			return { ok: false, error: "端口必须是 1-65535 之间的整数" };
		}
		port = value;
	}

	const envEntries = Object.entries(input.env ?? {})
		.map(([key, value]) => [key.trim(), value] as const)
		.filter(([key]) => key.length > 0);

	return {
		ok: true,
		value: {
			name,
			cwd,
			command,
			port,
			env: envEntries.length > 0 ? Object.fromEntries(envEntries) : undefined,
			autoStart: input.autoStart === true,
		},
	};
}

export class ProcessManager {
	private items = new Map<string, Managed>();
	private stateDirty = true;
	private flushTimer: ReturnType<typeof setInterval>;
	private startChain: Promise<unknown> = Promise.resolve();

	onState?: (states: RuntimeState[]) => void;
	onLogs?: (id: string, lines: LogLine[]) => void;
	onToast?: (toast: ToastPayload) => void;

	constructor() {
		for (const config of loadApps()) {
			this.items.set(config.id, {
				config,
				status: "stopped",
				portReady: false,
				effectivePort: config.port,
				expectedExit: false,
				runId: 0,
				logs: new LogBuffer(),
				pending: [],
			});
		}

		this.flushTimer = setInterval(() => this.flush(), LOG_FLUSH_INTERVAL_MS);
		this.flushTimer.unref?.();

		queueMicrotask(() => {
			for (const item of this.items.values()) {
				if (item.config.autoStart) void this.start(item.config.id);
			}
		});
	}

	getStates(): RuntimeState[] {
		return [...this.items.values()].map((item) => this.snapshot(item));
	}

	getLogs(id: string, afterSeq = 0, limit = 5000): { lines: LogLine[]; lastSeq: number } {
		const item = this.items.get(id);
		if (!item) return { lines: [], lastSeq: 0 };
		return {
			lines: item.logs.since(afterSeq, limit),
			lastSeq: item.logs.lastSeq,
		};
	}

	async start(id: string): Promise<ActionResult> {
		const run = this.startChain.then(
			() => this.startInternal(id),
			() => this.startInternal(id),
		);
		this.startChain = run.catch(() => undefined);
		return run;
	}

	private async startInternal(id: string): Promise<ActionResult> {
		const item = this.items.get(id);
		if (!item) return { ok: false, error: "应用不存在" };
		if (item.status === "running" || item.status === "starting") return { ok: true };
		if (item.status === "stopping") {
			return { ok: false, error: "正在停止中，请稍后再试" };
		}

		item.status = "starting";
		item.failure = undefined;
		item.exitCode = undefined;
		item.portReady = false;
		item.effectivePort = item.config.port;
		this.log(id, "system", `▶ 启动：${item.config.command}`);
		this.log(id, "system", `  目录：${item.config.cwd}`);
		this.touch();

		if (!existsSync(item.config.cwd)) {
			this.fail(item, { reason: "工作目录不存在", hint: item.config.cwd });
			return { ok: false, error: "工作目录不存在" };
		}

		if (item.config.port) {
			const info = await checkPort(item.config.port);
			if (!info.free) {
				const who = info.owner
					? `${info.owner.command} (PID ${info.owner.pid})`
					: "其他进程";
				const reason = `端口 ${item.config.port} 已被 ${who} 占用`;
				this.fail(item, {
					reason,
					hint: "先停止占用该端口的进程，或换一个端口再试",
				});
				this.onToast?.({ kind: "error", message: reason });
				return { ok: false, error: reason };
			}
		}

		const env: Record<string, string | undefined> = { ...process.env };
		if (item.config.env) Object.assign(env, item.config.env);
		if (item.config.port) env.PORT = String(item.config.port);

		const shell = process.env.SHELL || "/bin/zsh";
		let proc: Bun.Subprocess;

		try {
			proc = Bun.spawn([shell, "-l", "-c", item.config.command], {
				cwd: item.config.cwd,
				env,
				stdin: "ignore",
				stdout: "pipe",
				stderr: "pipe",
			});
		} catch (error) {
			this.fail(item, {
				reason: "无法启动进程",
				hint: error instanceof Error ? error.message : String(error),
			});
			return { ok: false, error: "无法启动进程" };
		}

		const runId = ++item.runId;
		item.proc = proc;
		item.pid = proc.pid;
		item.startedAt = Date.now();
		item.expectedExit = false;
		item.status = "starting";
		this.touch();

		void this.pump(
			item,
			runId,
			proc.stdout as ReadableStream<Uint8Array> | undefined,
			"stdout",
		);
		void this.pump(
			item,
			runId,
			proc.stderr as ReadableStream<Uint8Array> | undefined,
			"stderr",
		);

		proc.exited
			.then((code) => this.handleExit(item, runId, code))
			.catch((error) => {
				void this.handleExit(item, runId, 1, error);
			});

		this.startReadiness(item, runId);
		return { ok: true };
	}

	async stop(id: string): Promise<ActionResult> {
		const item = this.items.get(id);
		if (!item) return { ok: false, error: "应用不存在" };
		if (!item.proc || item.pid === undefined) {
			item.status = "stopped";
			item.portReady = false;
			item.pid = undefined;
			this.touch();
			return { ok: true };
		}

		item.status = "stopping";
		item.expectedExit = true;
		this.log(id, "system", "■ 正在停止…");
		this.touch();

		const pid = item.pid;
		const proc = item.proc;

		// Detach handlers from this run so a late exit cannot overwrite our state.
		item.runId++;

		await killTree(pid, "SIGTERM");
		const exited = await Promise.race([
			proc.exited.then(() => true).catch(() => true),
			delay(4000).then(() => false),
		]);

		if (!exited) {
			await killTree(pid, "SIGKILL");
			await Promise.race([
				proc.exited.then(() => true).catch(() => true),
				delay(2000).then(() => false),
			]);
		}

		item.proc = undefined;
		item.pid = undefined;
		item.portReady = false;
		item.effectivePort = item.config.port;
		item.status = "stopped";
		item.failure = undefined;
		this.log(id, "system", "■ 已停止");
		this.touch();
		return { ok: true };
	}

	async restart(id: string): Promise<ActionResult> {
		const item = this.items.get(id);
		if (!item) return { ok: false, error: "应用不存在" };

		await this.stop(id);
		await delay(150);
		return this.start(id);
	}

	clearLogs(id: string): ActionResult {
		const item = this.items.get(id);
		if (!item) return { ok: false, error: "应用不存在" };
		item.logs.clear();
		item.pending = [];
		this.touch();
		return { ok: true };
	}

	addApp(input: AppInput): ActionResult & { id?: string } {
		const normalized = normalizeInput(input);
		if (!normalized.ok) return { ok: false, error: normalized.error };

		const config: AppConfig = {
			id: randomUUID(),
			...normalized.value,
		};

		this.items.set(config.id, {
			config,
			status: "stopped",
			portReady: false,
			effectivePort: config.port,
			expectedExit: false,
			runId: 0,
			logs: new LogBuffer(),
			pending: [],
		});

		this.persist();
		this.touch();
		return { ok: true, id: config.id };
	}

	updateApp(id: string, input: AppInput): ActionResult {
		const item = this.items.get(id);
		if (!item) return { ok: false, error: "应用不存在" };

		const normalized = normalizeInput(input);
		if (!normalized.ok) return { ok: false, error: normalized.error };

		item.config = { ...item.config, ...normalized.value };
		if (item.status !== "running" && item.status !== "starting") {
			item.effectivePort = item.config.port;
		}

		this.log(id, "system", "✎ 配置已更新，重启后生效");
		this.persist();
		this.touch();
		return { ok: true };
	}

	async removeApp(id: string): Promise<ActionResult> {
		const item = this.items.get(id);
		if (!item) return { ok: false, error: "应用不存在" };

		await this.stop(id);
		this.items.delete(id);
		this.persist();
		this.touch();
		return { ok: true };
	}

	async checkPort(port: number) {
		return checkPort(port);
	}

	/** Synchronously terminate every managed process (used during app quit). */
	killAllSync(): void {
		for (const item of this.items.values()) {
			if (item.pid === undefined) continue;
			killTreeSync(item.pid);
			item.pid = undefined;
			item.proc = undefined;
		}
	}

	private startReadiness(item: Managed, runId: number) {
		const startedAt = Date.now();

		const tick = async () => {
			if (runId !== item.runId) return;
			if (item.status !== "starting" && item.status !== "running") return;

			const port = item.effectivePort;
			const elapsed = Date.now() - startedAt;

			if (port) {
				const listening = await isPortListening(port);
				if (runId !== item.runId) return;

				if (listening) {
					const wasStarting = item.status === "starting";
					item.portReady = true;
					item.status = "running";
					if (wasStarting) {
						this.log(item.config.id, "system", `✓ 服务已就绪：http://localhost:${port}`);
						this.onToast?.({
							kind: "success",
							message: `${item.config.name} 已在 :${port} 启动`,
						});
					}
					this.stopReadiness(item);
					this.touch();
					return;
				}

				if (elapsed > READY_TIMEOUT_MS && item.status === "starting") {
					item.status = "running";
					this.log(
						item.config.id,
						"system",
						`⚠ ${READY_TIMEOUT_MS / 1000}s 内未检测到端口 ${port} 监听，进程仍在运行`,
					);
					this.stopReadiness(item);
					this.touch();
				}
				return;
			}

			if (elapsed > NO_PORT_GRACE_MS && item.status === "starting") {
				item.status = "running";
				this.log(item.config.id, "system", "✓ 进程已启动（未检测到端口）");
				this.stopReadiness(item);
				this.touch();
			}
		};

		this.stopReadiness(item);
		item.readyTimer = setInterval(() => {
			void tick();
		}, PORT_READY_INTERVAL_MS);
		item.readyTimer.unref?.();
	}

	private stopReadiness(item: Managed) {
		if (item.readyTimer) {
			clearInterval(item.readyTimer);
			item.readyTimer = undefined;
		}
	}

	private async pump(
		item: Managed,
		runId: number,
		stream: ReadableStream<Uint8Array> | undefined,
		kind: "stdout" | "stderr",
	) {
		if (!stream) return;

		const reader = stream.getReader();
		const decoder = new TextDecoder();
		let buffer = "";

		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				if (runId !== item.runId) break;

				buffer += decoder.decode(value, { stream: true });
				const parts = buffer.split(/\r?\n/);
				buffer = parts.pop() ?? "";
				for (const part of parts) this.handleOutput(item, runId, kind, part);
			}
			if (buffer.trim().length > 0) this.handleOutput(item, runId, kind, buffer);
		} catch {
			// Stream closed by process termination.
		}
	}

	private handleOutput(
		item: Managed,
		runId: number,
		kind: "stdout" | "stderr",
		text: string,
	) {
		if (runId !== item.runId) return;

		const line = item.logs.append(kind, text);
		if (line) {
			item.pending.push(line);
			if (DEBUG) console.log(`[${item.config.name}:${kind}] ${line.text}`);
		}

		if (!item.portReady) {
			const detected = detectPortFromLine(text);
			if (detected && detected !== item.effectivePort) {
				item.effectivePort = detected;
				const note = item.logs.append("system", `检测到端口 ${detected}`);
				if (note) item.pending.push(note);
				this.touch();
			}
		}
	}

	private async handleExit(
		item: Managed,
		runId: number,
		code: number | null,
		error?: unknown,
	) {
		if (runId !== item.runId) return;

		this.stopReadiness(item);
		item.proc = undefined;
		item.pid = undefined;
		item.exitCode = code;
		item.portReady = false;

		const expected = item.expectedExit;
		item.expectedExit = false;

		if (expected) {
			item.status = "stopped";
			item.effectivePort = item.config.port;
			this.touch();
			return;
		}

		const effectiveCode = code ?? (error ? 1 : 0);

		if (effectiveCode === 0 && !error) {
			item.status = "stopped";
			this.log(item.config.id, "system", "■ 进程已退出（退出码 0）");
		} else {
			const failure = await this.analyzeFailure(item, effectiveCode, error);
			if (runId !== item.runId) return;
			item.status = "failed";
			item.failure = failure;
			this.log(item.config.id, "system", `✗ ${failure.reason}`);
			this.onToast?.({
				kind: "error",
				message: `${item.config.name}：${failure.reason}`,
			});
		}

		this.touch();
	}

	private async analyzeFailure(
		item: Managed,
		code: number,
		error?: unknown,
	): Promise<FailureInfo> {
		const tail = item.logs.tail(120).join("\n");
		const port = item.effectivePort ?? item.config.port;

		if (/EADDRINUSE|address already in use|port .{0,30}in use/i.test(tail)) {
			const owner = port ? await getPortOwner(port) : undefined;
			const who = owner ? `${owner.command} (PID ${owner.pid})` : "其他进程";
			return {
				reason: `端口 ${port} 已被 ${who} 占用`,
				hint: "停止占用该端口的进程，或在配置里换一个端口",
			};
		}

		if (/command not found|not found: |no such file or directory/i.test(tail)) {
			return {
				reason: "启动命令不可用",
				hint: "检查命令拼写，确认对应的工具已安装并在登录 shell 的 PATH 中",
			};
		}

		if (
			/Cannot find module|MODULE_NOT_FOUND|ERR_MODULE_NOT_FOUND|Failed to resolve import/i.test(
				tail,
			)
		) {
			return {
				reason: "依赖缺失",
				hint: "先在工作目录内安装依赖（bun install / npm install）",
			};
		}

		if (/EACCES|permission denied|operation not permitted/i.test(tail)) {
			return { reason: "权限不足", hint: "检查目录和可执行文件的权限" };
		}

		const stderr = item.logs
			.since(0)
			.filter((line) => line.stream === "stderr")
			.map((line) => line.text.trim())
			.filter(Boolean);

		return {
			reason: error
				? `无法运行进程：${error instanceof Error ? error.message : String(error)}`
				: `进程退出，退出码 ${code}`,
			hint: stderr.length > 0 ? stderr[stderr.length - 1] : undefined,
		};
	}

	private fail(item: Managed, failure: FailureInfo) {
		this.stopReadiness(item);
		item.status = "failed";
		item.failure = failure;
		item.portReady = false;
		item.proc = undefined;
		item.pid = undefined;
		this.log(item.config.id, "system", `✗ ${failure.reason}`);
		this.touch();
	}

	private log(id: string, stream: LogStream, text: string) {
		const item = this.items.get(id);
		if (!item) return;
		const line = item.logs.append(stream, text);
		if (line) item.pending.push(line);
		if (DEBUG) console.log(`[${item.config.name}:${stream}] ${text}`);
	}

	private snapshot(item: Managed): RuntimeState {
		const port = item.effectivePort ?? item.config.port;
		return {
			id: item.config.id,
			name: item.config.name,
			cwd: item.config.cwd,
			command: item.config.command,
			env: item.config.env,
			autoStart: item.config.autoStart,
			port,
			configuredPort: item.config.port,
			status: item.status,
			portReady: item.portReady,
			pid: item.pid,
			url: item.portReady && port ? `http://localhost:${port}` : undefined,
			startedAt: item.startedAt,
			exitCode: item.exitCode,
			failure: item.failure,
			cwdExists: existsSync(item.config.cwd),
		};
	}

	private persist() {
		try {
			saveApps([...this.items.values()].map((item) => item.config));
		} catch (error) {
			console.error("Failed to persist app config", error);
			this.onToast?.({
				kind: "error",
				message: "配置保存失败，请检查磁盘权限",
			});
		}
	}

	private touch() {
		this.stateDirty = true;
	}

	private flush() {
		if (this.stateDirty) {
			this.stateDirty = false;
			this.onState?.(this.getStates());
		}

		for (const item of this.items.values()) {
			if (item.pending.length === 0) continue;
			const batch = item.pending.splice(0, 200);
			this.onLogs?.(item.config.id, batch);
		}
	}
}

async function listDescendants(rootPid: number): Promise<number[]> {
	const proc = Bun.spawn(["ps", "-axo", "pid=,ppid="], {
		stdout: "pipe",
		stderr: "ignore",
	});

	const output = await new Response(proc.stdout).text();
	await proc.exited;

	const children = new Map<number, number[]>();
	for (const rawLine of output.split("\n")) {
		const [pidText, ppidText] = rawLine.trim().split(/\s+/);
		if (!pidText || !ppidText) continue;
		const pid = Number(pidText);
		const ppid = Number(ppidText);
		if (!Number.isFinite(pid) || !Number.isFinite(ppid)) continue;
		const list = children.get(ppid) ?? [];
		list.push(pid);
		children.set(ppid, list);
	}

	const ordered: number[] = [];
	const walk = (pid: number) => {
		for (const child of children.get(pid) ?? []) {
			walk(child);
			ordered.push(child);
		}
	};
	walk(rootPid);
	return ordered;
}

function signal(pids: number[], sig: NodeJS.Signals) {
	for (const pid of pids) {
		try {
			process.kill(pid, sig);
		} catch {
			// Already gone.
		}
	}
}

async function killTree(rootPid: number, sig: NodeJS.Signals) {
	try {
		const descendants = await listDescendants(rootPid);
		signal(descendants, sig);
	} catch {
		// Fall through to killing the root.
	}
	try {
		process.kill(rootPid, sig);
	} catch {
		// Already gone.
	}
}

function killTreeSync(rootPid: number) {
	try {
		const result = Bun.spawnSync(["ps", "-axo", "pid=,ppid="], {
			stdout: "pipe",
			stderr: "ignore",
		});
		const output = new TextDecoder().decode(result.stdout);
		const children = new Map<number, number[]>();
		for (const rawLine of output.split("\n")) {
			const [pidText, ppidText] = rawLine.trim().split(/\s+/);
			if (!pidText || !ppidText) continue;
			const pid = Number(pidText);
			const ppid = Number(ppidText);
			if (!Number.isFinite(pid) || !Number.isFinite(ppid)) continue;
			const list = children.get(ppid) ?? [];
			list.push(pid);
			children.set(ppid, list);
		}

		const ordered: number[] = [];
		const walk = (pid: number) => {
			for (const child of children.get(pid) ?? []) {
				walk(child);
				ordered.push(child);
			}
		};
		walk(rootPid);
		ordered.push(rootPid);

		for (const pid of ordered) {
			try {
				process.kill(pid, "SIGTERM");
			} catch {
				// Already gone.
			}
		}
	} catch {
		try {
			process.kill(rootPid, "SIGTERM");
		} catch {
			// Already gone.
		}
	}
}
