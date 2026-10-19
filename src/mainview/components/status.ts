import type { AppStatus } from "../../shared/types";

export const STATUS_META: Record<
	AppStatus,
	{ label: string; dot: string; badge: string; text: string }
> = {
	stopped: {
		label: "已停止",
		dot: "bg-faint",
		badge: "border-line bg-white/[0.03] text-muted",
		text: "text-muted",
	},
	starting: {
		label: "启动中",
		dot: "bg-amber animate-pulse",
		badge: "border-amber/25 bg-amber/10 text-amber",
		text: "text-amber",
	},
	running: {
		label: "运行中",
		dot: "bg-green",
		badge: "border-green/25 bg-green/10 text-green",
		text: "text-green",
	},
	stopping: {
		label: "停止中",
		dot: "bg-amber animate-pulse",
		badge: "border-amber/25 bg-amber/10 text-amber",
		text: "text-amber",
	},
	failed: {
		label: "启动失败",
		dot: "bg-red",
		badge: "border-red/25 bg-red/10 text-red",
		text: "text-red",
	},
};
