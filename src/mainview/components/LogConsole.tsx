import { useEffect, useMemo, useRef, useState } from "react";
import type { LogLine } from "../../shared/types";
import { cn, copyText, formatTime } from "../lib";
import { CheckIcon, CopyIcon, TrashIcon } from "./Icons";

type Props = {
	lines: LogLine[];
	onClear: () => void;
};

type FilterMode = "all" | "errors";

export function LogConsole({ lines, onClear }: Props) {
	const [query, setQuery] = useState("");
	const [mode, setMode] = useState<FilterMode>("all");
	const [autoScroll, setAutoScroll] = useState(true);
	const [copied, setCopied] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	const visible = useMemo(() => {
		const keyword = query.trim().toLowerCase();
		return lines.filter((line) => {
			if (mode === "errors" && line.stream !== "stderr" && line.stream !== "system") {
				return false;
			}
			if (keyword && !line.text.toLowerCase().includes(keyword)) return false;
			return true;
		});
	}, [lines, mode, query]);

	useEffect(() => {
		if (!autoScroll) return;
		const element = containerRef.current;
		if (element) element.scrollTop = element.scrollHeight;
	}, [visible.length, autoScroll]);

	const handleScroll = () => {
		const element = containerRef.current;
		if (!element) return;
		const atBottom =
			element.scrollHeight - element.scrollTop - element.clientHeight < 24;
		if (autoScroll && !atBottom) setAutoScroll(false);
		if (!autoScroll && atBottom) setAutoScroll(true);
	};

	const handleCopy = async () => {
		const text = visible
			.map((line) => `${formatTime(line.ts)}  ${line.text}`)
			.join("\n");
		const ok = await copyText(text);
		if (ok) {
			setCopied(true);
			setTimeout(() => setCopied(false), 1400);
		}
	};

	return (
		<section className="flex min-h-0 flex-1 flex-col border-t border-line">
			<div className="flex h-9 shrink-0 items-center gap-2 border-b border-line/70 px-4">
				<div className="flex items-center gap-1.5">
					<span className="text-[11px] font-medium text-muted">日志</span>
					<span className="font-mono text-[10px] text-faint">
						{visible.length}
					</span>
				</div>

				<div className="ml-2 flex h-6 items-center rounded-md border border-line bg-black/20 p-0.5">
					{(
						[
							["all", "全部"],
							["errors", "错误"],
						] as const
					).map(([value, label]) => (
						<button
							key={value}
							type="button"
							onClick={() => setMode(value)}
							className={cn(
								"h-5 rounded px-2 text-[10.5px] transition-colors",
								mode === value
									? "bg-white/[0.09] text-fg"
									: "text-faint hover:text-muted",
							)}
						>
							{label}
						</button>
					))}
				</div>

				<input
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder="过滤日志"
					spellCheck={false}
					className="h-6 w-[160px] rounded-md border border-transparent bg-transparent px-1.5 text-[11.5px] text-fg placeholder:text-faint hover:border-line focus:border-line focus:bg-black/20"
				/>

				<div className="flex-1" />

				<button
					type="button"
					onClick={() => setAutoScroll((value) => !value)}
					className={cn(
						"inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-[10.5px] transition-colors",
						autoScroll
							? "text-muted hover:bg-white/[0.05]"
							: "text-faint hover:bg-white/[0.05]",
					)}
					title="自动滚动到最新日志"
				>
					<span
						className={cn(
							"inline-block h-[5px] w-[5px] rounded-full",
							autoScroll ? "bg-green" : "bg-faint",
						)}
					/>
					自动滚动
				</button>

				<button
					type="button"
					className="icon-btn h-6 w-6"
					onClick={handleCopy}
					title="复制全部日志"
				>
					{copied ? (
						<CheckIcon size={12} className="text-green" />
					) : (
						<CopyIcon size={12} />
					)}
				</button>

				<button
					type="button"
					className="icon-btn h-6 w-6"
					onClick={onClear}
					title="清空日志"
				>
					<TrashIcon size={12} />
				</button>
			</div>

			<div
				ref={containerRef}
				onScroll={handleScroll}
				className="min-h-0 flex-1 overflow-y-auto px-3 py-2 font-mono text-[11.5px] leading-[1.7]"
			>
				{visible.length === 0 ? (
					<div className="flex h-full items-center justify-center text-[11.5px] text-faint">
						{lines.length === 0 ? "暂无日志输出" : "没有匹配的日志"}
					</div>
				) : (
					visible.map((line) => (
						<div
							key={line.seq}
							className="flex gap-3 rounded px-1 hover:bg-white/[0.03]"
						>
							<span className="w-[52px] shrink-0 select-none text-[10px] text-faint/60">
								{formatTime(line.ts)}
							</span>
							<span
								className={cn(
									"min-w-0 flex-1 whitespace-pre-wrap break-words",
									line.stream === "stderr"
										? "text-[#F28B8B]"
										: line.stream === "system"
											? "text-cyan/80"
											: "text-[#B9B9C0]",
								)}
							>
								{line.text}
							</span>
						</div>
					))
				)}
			</div>
		</section>
	);
}
