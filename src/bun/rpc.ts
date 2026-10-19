import { BrowserView, Utils } from "electrobun/main";
import type { AppRPC } from "../shared/types";
import type { ProcessManager } from "./process-manager";
import { scanDirectory } from "./scanner";

export function createAppRpc(manager: ProcessManager) {
	return BrowserView.defineRPC<AppRPC>({
		maxRequestTime: 120_000,
		handlers: {
			requests: {
				listApps: () => manager.getStates(),
				getLogs: ({ id, afterSeq, limit }) =>
					manager.getLogs(id, afterSeq, limit),
				startApp: ({ id }) => manager.start(id),
				stopApp: ({ id }) => manager.stop(id),
				restartApp: ({ id }) => manager.restart(id),
				clearLogs: ({ id }) => manager.clearLogs(id),
				addApp: ({ input }) => manager.addApp(input),
				updateApp: ({ id, input }) => manager.updateApp(id, input),
				removeApp: ({ id }) => manager.removeApp(id),
				checkPort: ({ port }) => manager.checkPort(port),
				openUrl: ({ url }) => {
					const ok = Utils.openExternal(url);
					return ok ? { ok: true } : { ok: false, error: "无法打开该链接" };
				},
				revealPath: ({ path }) => {
					try {
						Utils.showItemInFolder(path);
						return { ok: true };
					} catch (error) {
						return {
							ok: false,
							error: error instanceof Error ? error.message : String(error),
						};
					}
				},
				pickDirectory: async ({ startingFolder }) => {
					try {
						const selected = await Utils.openFileDialog({
							startingFolder: startingFolder ?? Utils.paths.home,
							canChooseFiles: false,
							canChooseDirectory: true,
							allowsMultipleSelection: false,
						});
						return { path: selected[0] };
					} catch {
						return {};
					}
				},
				scanDirectory: ({ root }) => {
					const existing = manager.getStates().map((state) => state.cwd);
					return scanDirectory(root, existing);
				},
			},
			messages: {
				appReady: () => {
					console.log("[devDashboard] webview ready");
					manager.onState?.(manager.getStates());
				},
			},
		},
	});
}
