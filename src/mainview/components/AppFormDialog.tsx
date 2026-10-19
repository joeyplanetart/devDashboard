import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type {
	ActionResult,
	AppInput,
	PortCheck,
	RuntimeState,
} from "../../shared/types";
import { cn } from "../lib";
import { FolderIcon } from "./Icons";
import { Modal } from "./Modal";

type Props = {
	mode: "add" | "edit";
	initial?: RuntimeState;
	onClose: () => void;
	onSubmit: (input: AppInput) => Promise<ActionResult>;
	pickDirectory: (startingFolder?: string) => Promise<string | undefined>;
	checkPort: (port: number) => Promise<PortCheck>;
};

function envToText(env?: Record<string, string>): string {
	if (!env) return "";
	return Object.entries(env)
		.map(([key, value]) => `${key}=${value}`)
		.join("\n");
}

function textToEnv(text: string): Record<string, string> | undefined {
	const env: Record<string, string> = {};
	for (const rawLine of text.split("\n")) {
		const line = rawLine.trim();
		if (!line || line.startsWith("#")) continue;
		const index = line.indexOf("=");
		if (index <= 0) continue;
		const key = line.slice(0, index).trim();
		if (!key) continue;
		env[key] = line.slice(index + 1).trim();
	}
	return Object.keys(env).length > 0 ? env : undefined;
}

function Field({
	label,
	hint,
	className,
	children,
}: {
	label: string;
	hint?: ReactNode;
	className?: string;
	children: ReactNode;
}) {
	return (
		<label className={cn("block", className)}>
			<span className="mb-1.5 block text-[11px] font-medium text-muted">
				{label}
			</span>
			{children}
			{hint && <span className="mt-1 block text-[10.5px]">{hint}</span>}
		</label>
	);
}

export function AppFormDialog({
	mode,
	initial,
	onClose,
	onSubmit,
	pickDirectory,
	checkPort,
}: Props) {
	const [name, setName] = useState(initial?.name ?? "");
	const [cwd, setCwd] = useState(initial?.cwd ?? "");
	const [command, setCommand] = useState(initial?.command ?? "");
	const [port, setPort] = useState(
		initial?.configuredPort ? String(initial.configuredPort) : "",
	);
	const [envText, setEnvText] = useState(envToText(initial?.env));
	const [autoStart, setAutoStart] = useState(initial?.autoStart === true);
	const [saving, setSaving] = useState(false);
	const [checking, setChecking] = useState(false);
	const [portInfo, setPortInfo] = useState<PortCheck | null>(null);

	const portValue = port.trim() ? Number(port) : undefined;
	const validPort =
		portValue === undefined ||
		(Number.isInteger(portValue) && portValue >= 1 && portValue <= 65535);

	useEffect(() => {
		if (portValue === undefined || !validPort) {
			setPortInfo(null);
			setChecking(false);
			return;
		}

		let cancelled = false;
		setChecking(true);
		const timer = setTimeout(async () => {
			try {
				const info = await checkPort(portValue);
				if (!cancelled) {
					setPortInfo(info);
					setChecking(false);
				}
			} catch {
				if (!cancelled) setChecking(false);
			}
		}, 400);

		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	}, [portValue, validPort, checkPort]);

	const handlePick = async () => {
		const selected = await pickDirectory(cwd || undefined);
		if (selected) setCwd(selected);
	};

	const handleSubmit = async (event: FormEvent) => {
		event.preventDefault();
		if (saving) return;
		if (!validPort) return;

		setSaving(true);
		const result = await onSubmit({
			name,
			cwd,
			command,
			port: portValue,
			env: textToEnv(envText),
			autoStart,
		});
		setSaving(false);
		if (result.ok) onClose();
	};

	const portHint = !port.trim() ? (
		<span className="text-faint">留空则从日志中自动检测</span>
	) : !validPort ? (
		<span className="text-red">端口范围 1-65535</span>
	) : checking ? (
		<span className="text-faint">检查端口占用…</span>
	) : portInfo && !portInfo.free ? (
		<span className="text-red">
			已被 {portInfo.owner?.command ?? "其他进程"}
			{portInfo.owner ? ` (PID ${portInfo.owner.pid})` : ""} 占用
		</span>
	) : portInfo ? (
		<span className="text-green">端口可用</span>
	) : null;

	return (
		<Modal
			title={mode === "add" ? "添加应用" : "编辑应用"}
			subtitle={
				mode === "add"
					? "配置一个本地开发服务，启动后日志会实时显示在这里"
					: "修改会在下次启动时生效"
			}
			onClose={onClose}
			width={560}
			footer={
				<>
					<button type="button" className="btn-ghost" onClick={onClose}>
						取消
					</button>
					<button
						type="submit"
						form="app-form"
						className="btn-primary"
						disabled={saving || !validPort}
					>
						{saving ? "保存中…" : mode === "add" ? "添加" : "保存"}
					</button>
				</>
			}
		>
			<form id="app-form" onSubmit={handleSubmit} className="space-y-3.5">
				<Field label="应用名称">
					<input
						className="field"
						value={name}
						onChange={(event) => setName(event.target.value)}
						placeholder="例如 web-app"
						autoFocus
						spellCheck={false}
					/>
				</Field>

				<Field label="工作目录">
					<div className="flex gap-2">
						<input
							className="field font-mono"
							value={cwd}
							onChange={(event) => setCwd(event.target.value)}
							placeholder="/Users/you/code/my-app"
							spellCheck={false}
						/>
						<button
							type="button"
							className="btn-ghost shrink-0"
							onClick={handlePick}
						>
							<FolderIcon size={13} />
							选择
						</button>
					</div>
				</Field>

				<Field
					label="启动命令"
					hint={
						<span className="text-faint">
							通过登录 shell 执行，支持 bun / npm / pnpm 与 && 串联
						</span>
					}
				>
					<input
						className="field font-mono"
						value={command}
						onChange={(event) => setCommand(event.target.value)}
						placeholder="bun run dev"
						spellCheck={false}
					/>
				</Field>

				<Field label="端口" hint={portHint} className="max-w-[190px]">
					<input
						className="field font-mono"
						value={port}
						onChange={(event) => setPort(event.target.value)}
						placeholder="自动检测"
						inputMode="numeric"
						spellCheck={false}
					/>
				</Field>

				<Field
					label="环境变量"
					hint={<span className="text-faint">每行一个 KEY=VALUE</span>}
				>
					<textarea
						className="field h-[64px] resize-none font-mono leading-relaxed"
						value={envText}
						onChange={(event) => setEnvText(event.target.value)}
						placeholder="NODE_ENV=development"
						spellCheck={false}
					/>
				</Field>

				<label className="flex items-center gap-2 pt-0.5">
					<input
						type="checkbox"
						checked={autoStart}
						onChange={(event) => setAutoStart(event.target.checked)}
						className="h-3.5 w-3.5 accent-white"
					/>
					<span className="text-[11.5px] text-muted">
						随 devDashboard 启动时自动启动
					</span>
				</label>
			</form>
		</Modal>
	);
}
