import { PlusIcon, ScanIcon, TerminalIcon } from "./Icons";

type Props = {
	hasApps: boolean;
	onAdd: () => void;
	onScan: () => void;
};

export function EmptyState({ hasApps, onAdd, onScan }: Props) {
	return (
		<div className="flex h-full flex-col items-center justify-center gap-6">
			<div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-panel text-muted">
				<TerminalIcon size={24} />
			</div>

			<div className="text-center">
				<h2 className="text-[15px] font-semibold text-fg">
					{hasApps ? "选择一个应用" : "还没有应用"}
				</h2>
				<p className="mx-auto mt-1.5 max-w-[320px] text-[12px] leading-relaxed text-faint">
					{hasApps
						? "从左侧选择一个应用，查看端口、进程状态和实时日志。"
						: "添加本地开发服务，启动、停止、查看端口和终端日志都在这里完成。"}
				</p>
			</div>

			<div className="flex gap-2">
				<button type="button" className="btn-primary h-8 px-4" onClick={onAdd}>
					<PlusIcon size={13} />
					添加应用
				</button>
				<button type="button" className="btn-ghost h-8 px-4" onClick={onScan}>
					<ScanIcon size={13} />
					扫描导入
				</button>
			</div>

			<div className="mt-1 font-mono text-[10.5px] text-faint/70">
				⌘⏎ 启动 / 重启 · ⌘. 停止
			</div>
		</div>
	);
}
