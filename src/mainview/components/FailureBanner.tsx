import type { FailureInfo } from "../../shared/types";
import { AlertIcon, RestartIcon } from "./Icons";

type Props = {
	failure: FailureInfo;
	onRetry: () => void;
};

export function FailureBanner({ failure, onRetry }: Props) {
	return (
		<div className="mx-5 mb-3 rounded-lg border border-red/25 bg-red/[0.07] px-4 py-3">
			<div className="flex items-start gap-2.5">
				<AlertIcon size={14} className="mt-[1px] shrink-0 text-red" />
				<div className="min-w-0 flex-1">
					<div className="text-[12.5px] font-medium text-red">
						{failure.reason}
					</div>
					{failure.hint && (
						<div className="mt-1 text-[11.5px] leading-relaxed text-red/70">
							{failure.hint}
						</div>
					)}
				</div>
				<button
					type="button"
					onClick={onRetry}
					className="inline-flex h-6 shrink-0 items-center gap-1 rounded-md border border-red/30 bg-red/10 px-2 text-[11.5px] text-red transition-colors hover:bg-red/20"
				>
					<RestartIcon size={11} />
					重试
				</button>
			</div>
		</div>
	);
}
