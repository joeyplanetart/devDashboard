import { useEffect, useRef, useState } from "react";
import type { RuntimeState } from "../../shared/types";
import {
	ExternalIcon,
	FolderIcon,
	MoreIcon,
	PencilIcon,
	PlayIcon,
	RestartIcon,
	StopIcon,
	TrashIcon,
} from "./Icons";
import { StatusBadge } from "./StatusDot";

type Props = {
	app: RuntimeState;
	onStart: () => void;
	onStop: () => void;
	onRestart: () => void;
	onOpen: () => void;
	onEdit: () => void;
	onReveal: () => void;
	onDelete: () => void;
};

export function AppHeader({
	app,
	onStart,
	onStop,
	onRestart,
	onOpen,
	onEdit,
	onReveal,
	onDelete,
}: Props) {
	const [menuOpen, setMenuOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!menuOpen) return;
		const onPointerDown = (event: MouseEvent) => {
			if (!menuRef.current?.contains(event.target as Node)) {
				setMenuOpen(false);
			}
		};
		document.addEventListener("mousedown", onPointerDown);
		return () => document.removeEventListener("mousedown", onPointerDown);
	}, [menuOpen]);

	const busy = app.status === "starting" || app.status === "stopping";
	const isRunning = app.status === "running" || app.status === "starting";

	return (
		<header className="drag relative flex h-[62px] shrink-0 items-center gap-3 border-b border-line px-5">
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<h1 className="truncate text-[14px] font-semibold tracking-[-0.01em] text-fg">
						{app.name}
					</h1>
					<StatusBadge status={app.status} />
					{!app.cwdExists && (
						<span className="text-[10.5px] text-red">目录不存在</span>
					)}
				</div>
				<div className="mt-0.5 flex min-w-0 items-center gap-1.5">
					<FolderIcon size={11} className="shrink-0 text-faint" />
					<button
						type="button"
						onClick={onReveal}
						className="no-drag truncate font-mono text-[10.5px] text-faint transition-colors hover:text-muted"
						title={app.cwd}
					>
						{app.cwd}
					</button>
				</div>
			</div>

			<div className="no-drag flex shrink-0 items-center gap-1.5">
				{app.url && (
					<button type="button" className="btn-ghost" onClick={onOpen}>
						<ExternalIcon size={13} />
						打开
					</button>
				)}

				{isRunning ? (
					<>
						<button
							type="button"
							className="icon-btn border border-line"
							onClick={onRestart}
							disabled={busy}
							title="重启"
						>
							<RestartIcon size={14} />
						</button>
						<button
							type="button"
							className="btn-danger"
							onClick={onStop}
							disabled={app.status === "stopping"}
						>
							<StopIcon size={12} />
							停止
						</button>
					</>
				) : (
					<button
						type="button"
						className="btn-primary"
						onClick={onStart}
						disabled={busy || !app.cwdExists}
					>
						<PlayIcon size={11} />
						启动
					</button>
				)}

				<div className="relative" ref={menuRef}>
					<button
						type="button"
						className="icon-btn"
						onClick={() => setMenuOpen((value) => !value)}
						title="更多"
					>
						<MoreIcon size={15} />
					</button>

					{menuOpen && (
						<div className="absolute right-0 top-[34px] z-30 w-[176px] overflow-hidden rounded-lg border border-line bg-[#151517] py-1 shadow-2xl shadow-black/60">
							<button
								type="button"
								className="flex h-8 w-full items-center gap-2 px-3 text-left text-[12px] text-[#C9C9CF] hover:bg-white/[0.06]"
								onClick={() => {
									setMenuOpen(false);
									onEdit();
								}}
							>
								<PencilIcon size={13} />
								编辑配置
							</button>
							<button
								type="button"
								className="flex h-8 w-full items-center gap-2 px-3 text-left text-[12px] text-[#C9C9CF] hover:bg-white/[0.06]"
								onClick={() => {
									setMenuOpen(false);
									onReveal();
								}}
							>
								<FolderIcon size={13} />
								在 Finder 中显示
							</button>
							<div className="my-1 h-px bg-line" />
							<button
								type="button"
								className="flex h-8 w-full items-center gap-2 px-3 text-left text-[12px] text-red hover:bg-red/10"
								onClick={() => {
									setMenuOpen(false);
									onDelete();
								}}
							>
								<TrashIcon size={13} />
								删除应用
							</button>
						</div>
					)}
				</div>
			</div>
		</header>
	);
}
