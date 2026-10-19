import { useEffect, useState } from "react";
import type { RuntimeState } from "../../shared/types";
import { cn, copyText, formatUptime } from "../lib";
import { CheckIcon, CopyIcon, ExternalIcon } from "./Icons";

type Props = {
	app: RuntimeState;
	onOpen: (url: string) => void;
};

export function PortPanel({ app, onOpen }: Props) {
	const [copied, setCopied] = useState(false);
	const [, tick] = useState(0);

	useEffect(() => {
		if (app.status !== "running") return;
		const timer = setInterval(() => tick((value) => value + 1), 1000);
		return () => clearInterval(timer);
	}, [app.status]);

	const handleCopy = async () => {
		if (!app.url) return;
		const ok = await copyText(app.url);
		if (ok) {
			setCopied(true);
			setTimeout(() => setCopied(false), 1400);
		}
	};

	const uptime = formatUptime(app.startedAt);

	return (
		<div className="flex gap-3 px-5 py-4">
			<div className="min-w-0 flex-1 rounded-lg border border-line bg-panel px-4 py-3">
				<div className="text-[10px] uppercase tracking-[0.14em] text-faint">
					入口地址
				</div>

				{app.url ? (
					<div className="mt-1.5 flex items-center gap-1.5">
						<span className="min-w-0 flex-1 truncate font-mono text-[13px] text-fg">
							{app.url.replace(/^https?:\/\//, "")}
						</span>
						<button
							type="button"
							className="icon-btn h-6 w-6"
							onClick={handleCopy}
							title="复制地址"
						>
							{copied ? (
								<CheckIcon size={13} className="text-green" />
							) : (
								<CopyIcon size={13} />
							)}
						</button>
						<button
							type="button"
							className="icon-btn h-6 w-6"
							onClick={() => onOpen(app.url!)}
							title="在浏览器中打开"
						>
							<ExternalIcon size={13} />
						</button>
					</div>
				) : (
					<div
						className={cn(
							"mt-1.5 truncate text-[12px]",
							app.status === "failed" ? "text-red/80" : "text-muted",
						)}
					>
						{app.port
							? `端口 ${app.port}`
							: app.status === "running"
								? "进程运行中，未检测到监听端口"
								: "未配置端口"}
					</div>
				)}
			</div>

			<div className="w-[190px] shrink-0 rounded-lg border border-line bg-panel px-4 py-3">
				<div className="text-[10px] uppercase tracking-[0.14em] text-faint">
					进程
				</div>
				<div className="mt-1.5 flex items-center gap-1.5">
					<span
						className={cn(
							"inline-block h-[5px] w-[5px] rounded-full",
							app.status === "running"
								? "bg-green"
								: app.status === "failed"
									? "bg-red"
									: "bg-faint",
						)}
					/>
					<span className="font-mono text-[12px] text-fg">
						{app.pid ? `PID ${app.pid}` : "未运行"}
					</span>
				</div>
				<div className="mt-1 truncate text-[11px] text-faint">
					{app.status === "running" && uptime
						? `已运行 ${uptime}`
						: app.configuredPort
							? `配置端口 ${app.configuredPort}`
							: "—"}
				</div>
			</div>
		</div>
	);
}
