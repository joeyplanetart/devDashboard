import type { AppStatus } from "../../shared/types";
import { cn } from "../lib";
import { STATUS_META } from "./status";

export function StatusDot({
	status,
	className,
}: {
	status: AppStatus;
	className?: string;
}) {
	return (
		<span
			className={cn(
				"inline-block h-[6px] w-[6px] shrink-0 rounded-full",
				STATUS_META[status].dot,
				className,
			)}
		/>
	);
}

export function StatusBadge({ status }: { status: AppStatus }) {
	const meta = STATUS_META[status];
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 rounded-full border px-2 py-[2px] text-[10.5px] font-medium",
				meta.badge,
			)}
		>
			<span
				className={cn("inline-block h-[5px] w-[5px] rounded-full", meta.dot)}
			/>
			{meta.label}
		</span>
	);
}
