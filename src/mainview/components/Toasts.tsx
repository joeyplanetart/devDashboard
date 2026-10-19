import type { Toast } from "../hooks/useDashboard";
import { cn } from "../lib";
import { AlertIcon, CheckIcon, TerminalIcon } from "./Icons";

const ICONS = {
	info: TerminalIcon,
	success: CheckIcon,
	error: AlertIcon,
};

export function Toasts({ toasts }: { toasts: Toast[] }) {
	if (toasts.length === 0) return null;

	return (
		<div className="pointer-events-none fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
			{toasts.map((toast) => {
				const Icon = ICONS[toast.kind];
				return (
					<div
						key={toast.id}
						className={cn(
							"animate-toast pointer-events-auto flex max-w-[440px] items-center gap-2 rounded-lg border px-3 py-2 text-[12px] shadow-2xl shadow-black/60",
							toast.kind === "error"
								? "border-red/30 bg-[#2A1415] text-red"
								: toast.kind === "success"
									? "border-green/25 bg-[#102018] text-green"
									: "border-line bg-[#17171A] text-muted",
						)}
					>
						<Icon size={13} className="shrink-0" />
						<span className="leading-snug">{toast.message}</span>
					</div>
				);
			})}
		</div>
	);
}
