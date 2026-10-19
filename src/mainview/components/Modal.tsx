import { useEffect, type ReactNode } from "react";
import { CloseIcon } from "./Icons";

type Props = {
	title: string;
	subtitle?: string;
	children: ReactNode;
	footer?: ReactNode;
	onClose: () => void;
	width?: number;
};

export function Modal({
	title,
	subtitle,
	children,
	footer,
	onClose,
	width = 560,
}: Props) {
	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [onClose]);

	return (
		<div
			className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-6 backdrop-blur-[2px]"
			onMouseDown={(event) => {
				if (event.target === event.currentTarget) onClose();
			}}
		>
			<div
				className="animate-dialog flex max-h-[86vh] w-full flex-col overflow-hidden rounded-xl border border-line bg-[#111113] shadow-2xl shadow-black/70"
				style={{ width }}
			>
				<div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-4">
					<div>
						<h2 className="text-[13.5px] font-semibold text-fg">{title}</h2>
						{subtitle && (
							<p className="mt-0.5 text-[11.5px] text-faint">{subtitle}</p>
						)}
					</div>
					<button
						type="button"
						className="icon-btn -mr-1 -mt-1"
						onClick={onClose}
						title="关闭"
					>
						<CloseIcon size={14} />
					</button>
				</div>

				<div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

				{footer && (
					<div className="flex shrink-0 items-center justify-end gap-2 border-t border-line px-5 py-3">
						{footer}
					</div>
				)}
			</div>
		</div>
	);
}
