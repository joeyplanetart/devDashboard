import { useMemo, useState } from "react";
import type { RuntimeState } from "../../shared/types";
import { cn } from "../lib";
import { PlusIcon, ScanIcon, SearchIcon } from "./Icons";
import { StatusDot } from "./StatusDot";

type Props = {
	apps: RuntimeState[];
	selectedId: string | null;
	onSelect: (id: string) => void;
	onAdd: () => void;
	onScan: () => void;
	loading: boolean;
};

export function Sidebar({
	apps,
	selectedId,
	onSelect,
	onAdd,
	onScan,
	loading,
}: Props) {
	const [query, setQuery] = useState("");

	const filtered = useMemo(() => {
		const keyword = query.trim().toLowerCase();
		if (!keyword) return apps;
		return apps.filter(
			(app) =>
				app.name.toLowerCase().includes(keyword) ||
				app.cwd.toLowerCase().includes(keyword),
		);
	}, [apps, query]);

	const runningCount = apps.filter((app) => app.status === "running").length;

	return (
		<aside className="flex w-[248px] shrink-0 flex-col border-r border-line bg-[#0C0C0E]">
			<div className="drag flex h-[46px] items-center pl-[88px] pr-3">
				<span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">
					Dev Dashboard
				</span>
			</div>

			<div className="px-3 pb-2">
				<div className="relative">
					<SearchIcon
						size={13}
						className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-faint"
					/>
					<input
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder="搜索应用"
						spellCheck={false}
						className="h-7 w-full rounded-md border border-line bg-black/25 pl-7 pr-2 text-[12px] text-fg placeholder:text-faint focus:border-white/20"
					/>
				</div>
			</div>

			<div className="flex items-center justify-between px-3 pb-1.5 text-[10px] uppercase tracking-[0.12em] text-faint">
				<span>应用</span>
				<span className="font-mono normal-case tracking-normal">
					{runningCount}/{apps.length}
				</span>
			</div>

			<nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
				{loading && (
					<div className="px-2 py-3 text-[12px] text-faint">加载中…</div>
				)}

				{!loading && apps.length === 0 && (
					<div className="px-2 py-3 text-[12px] leading-relaxed text-faint">
						还没有应用。
						<br />
						点击下方添加，或扫描导入。
					</div>
				)}

				{!loading && apps.length > 0 && filtered.length === 0 && (
					<div className="px-2 py-3 text-[12px] text-faint">没有匹配的应用</div>
				)}

				{filtered.map((app) => {
					const active = app.id === selectedId;
					return (
						<button
							key={app.id}
							type="button"
							onClick={() => onSelect(app.id)}
							className={cn(
								"group mb-0.5 flex h-8 w-full items-center gap-2 rounded-md px-2 text-left transition-colors",
								active
									? "bg-white/[0.07]"
									: "hover:bg-white/[0.04]",
							)}
						>
							<StatusDot status={app.status} />
							<span
								className={cn(
									"min-w-0 flex-1 truncate text-[12.5px]",
									active ? "text-fg" : "text-[#C9C9CF]",
								)}
							>
								{app.name}
							</span>
							{app.port !== undefined && (
								<span className="font-mono text-[10px] text-faint">
									{app.port}
								</span>
							)}
						</button>
					);
				})}
			</nav>

			<div className="flex gap-1.5 border-t border-line p-2">
				<button type="button" className="btn-ghost flex-1 justify-start" onClick={onAdd}>
					<PlusIcon size={13} />
					添加应用
				</button>
				<button
					type="button"
					className="icon-btn border border-line"
					onClick={onScan}
					title="扫描导入"
				>
					<ScanIcon size={14} />
				</button>
			</div>
		</aside>
	);
}
