import { useCallback, useEffect, useRef, useState } from "react";
import type {
	ActionResult,
	AppInput,
	LogLine,
	RuntimeState,
	ScanCandidate,
	ToastPayload,
} from "../../shared/types";
import { api, send, setRpcHandlers } from "../rpc";

export type Toast = ToastPayload & { id: number };

const MAX_LOG_LINES = 4000;

function mergeLines(existing: LogLine[], incoming: LogLine[]): LogLine[] {
	const map = new Map<number, LogLine>();
	for (const line of existing) map.set(line.seq, line);
	for (const line of incoming) map.set(line.seq, line);
	const merged = [...map.values()].sort((a, b) => a.seq - b.seq);
	return merged.length > MAX_LOG_LINES ? merged.slice(-MAX_LOG_LINES) : merged;
}

export function useDashboard() {
	const [apps, setApps] = useState<RuntimeState[]>([]);
	const [logs, setLogs] = useState<Record<string, LogLine[]>>({});
	const [toasts, setToasts] = useState<Toast[]>([]);
	const [ready, setReady] = useState(false);
	const toastSeq = useRef(0);

	const pushToast = useCallback((toast: ToastPayload) => {
		const id = ++toastSeq.current;
		setToasts((prev) => [...prev.slice(-2), { ...toast, id }]);
		setTimeout(() => {
			setToasts((prev) => prev.filter((item) => item.id !== id));
		}, 4200);
	}, []);

	useEffect(() => {
		let cancelled = false;

		setRpcHandlers({
			onState: (states) => {
				if (cancelled) return;
				setApps(states);
				setReady(true);
			},
			onLogs: (id, lines) => {
				if (cancelled) return;
				setLogs((prev) => ({
					...prev,
					[id]: mergeLines(prev[id] ?? [], lines),
				}));
			},
			onToast: (toast) => {
				if (!cancelled) pushToast(toast);
			},
		});

		api
			.listApps({})
			.then((states) => {
				if (cancelled) return;
				setApps(states);
				setReady(true);
			})
			.catch(() => setReady(true));

		send.appReady({});

		return () => {
			cancelled = true;
			setRpcHandlers({
				onState: () => {},
				onLogs: () => {},
				onToast: () => {},
			});
		};
	}, [pushToast]);

	const loadLogs = useCallback(async (id: string) => {
		try {
			const result = await api.getLogs({ id, afterSeq: 0 });
			setLogs((prev) => ({
				...prev,
				[id]: mergeLines(result.lines, prev[id] ?? []),
			}));
		} catch {
			// Ignore transient failures.
		}
	}, []);

	const startApp = useCallback(
		async (id: string) => {
			const result = await api.startApp({ id });
			if (!result.ok) {
				pushToast({ kind: "error", message: result.error ?? "启动失败" });
			}
		},
		[pushToast],
	);

	const stopApp = useCallback(
		async (id: string) => {
			const result = await api.stopApp({ id });
			if (!result.ok) {
				pushToast({ kind: "error", message: result.error ?? "停止失败" });
			}
		},
		[pushToast],
	);

	const restartApp = useCallback(
		async (id: string) => {
			const result = await api.restartApp({ id });
			if (!result.ok) {
				pushToast({ kind: "error", message: result.error ?? "重启失败" });
			}
		},
		[pushToast],
	);

	const clearLogs = useCallback(async (id: string) => {
		setLogs((prev) => ({ ...prev, [id]: [] }));
		await api.clearLogs({ id });
	}, []);

	const addApp = useCallback(
		async (input: AppInput): Promise<ActionResult & { id?: string }> => {
			const result = await api.addApp({ input });
			if (!result.ok) {
				pushToast({ kind: "error", message: result.error ?? "添加失败" });
			} else {
				pushToast({ kind: "success", message: `已添加 ${input.name}` });
			}
			return result;
		},
		[pushToast],
	);

	const updateApp = useCallback(
		async (id: string, input: AppInput): Promise<ActionResult> => {
			const result = await api.updateApp({ id, input });
			if (!result.ok) {
				pushToast({ kind: "error", message: result.error ?? "保存失败" });
			}
			return result;
		},
		[pushToast],
	);

	const removeApp = useCallback(
		async (id: string): Promise<ActionResult> => {
			const result = await api.removeApp({ id });
			if (!result.ok) {
				pushToast({ kind: "error", message: result.error ?? "删除失败" });
			}
			setLogs((prev) => {
				const next = { ...prev };
				delete next[id];
				return next;
			});
			return result;
		},
		[pushToast],
	);

	const openUrl = useCallback(
		async (url: string) => {
			const result = await api.openUrl({ url });
			if (!result.ok) {
				pushToast({ kind: "error", message: result.error ?? "无法打开链接" });
			}
		},
		[pushToast],
	);

	const revealPath = useCallback(async (path: string) => {
		await api.revealPath({ path });
	}, []);

	const pickDirectory = useCallback(
		async (startingFolder?: string) => {
			const result = await api.pickDirectory({ startingFolder });
			return result.path;
		},
		[],
	);

	const scanDirectory = useCallback(
		async (root: string): Promise<ScanCandidate[]> => {
			try {
				return await api.scanDirectory({ root });
			} catch {
				return [];
			}
		},
		[],
	);

	const checkPort = useCallback(async (port: number) => {
		return api.checkPort({ port });
	}, []);

	return {
		apps,
		logs,
		toasts,
		ready,
		loadLogs,
		startApp,
		stopApp,
		restartApp,
		clearLogs,
		addApp,
		updateApp,
		removeApp,
		openUrl,
		revealPath,
		pickDirectory,
		scanDirectory,
		checkPort,
		pushToast,
	};
}
