import { useCallback, useEffect, useRef, useState } from "react";
import type { ActionResult, AppInput, ScanCandidate } from "../../shared/types";
import { cn } from "../lib";
import { CheckIcon, FolderIcon, ScanIcon } from "./Icons";
import { Modal } from "./Modal";

type Props = {
	onClose: () => void;
	scanDirectory: (root: string) => Promise<ScanCandidate[]>;
	pickDirectory: (startingFolder?: string) => Promise<string | undefined>;
	addApp: (input: AppInput) => Promise<ActionResult>;
};

export function ScanDialog({
	onClose,
	scanDirectory,
	pickDirectory,
	addApp,
}: Props) {
	const [root, setRoot] = useState("~/mycode");
	const [results, setResults] = useState<ScanCandidate[]>([]);
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [scanning, setScanning] = useState(false);
	const [importing, setImporting] = useState(false);
	const [scanned, setScanned] = useState(false);
	const startedRef = useRef(false);

	const runScan = useCallback(async () => {
		setScanning(true);
		setScanned(false);
		const list = await scanDirectory(root);
		setResults(list);
		setSelected(new Set(list.filter((item) => !item.alreadyAdded).map((item) => item.key)));
		setScanning(false);
		setScanned(true);
	}, [root, scanDirectory]);

	useEffect(() => {
		if (startedRef.current) return;
		startedRef.current = true;
		void runScan();
	}, [runScan]);

	const toggle = (key: string) => {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
	};

	const handlePick = async () => {
		const path = await pickDirectory(
			root.startsWith("~") ? undefined : root || undefined,
		);
		if (path) setRoot(path);
	};

	const handleImport = async () => {
		if (importing || selected.size === 0) return;
		setImporting(true);

		for (const key of selected) {
			const candidate = results.find((item) => item.key === key);
			if (!candidate) continue;
			await addApp({
				name: candidate.name,
				cwd: candidate.cwd,
				command: candidate.command,
				port: candidate.port,
			});
		}

		setImporting(false);
		onClose();
	};

	const importable = results.filter((item) => !item.alreadyAdded).length;

	return (
		<Modal
			title="扫描导入"
			subtitle="扫描目录下带 package.json 的项目，自动识别启动命令和端口"
			onClose={onClose}
			width={660}
			footer={
				<>
					<button type="button" className="btn-ghost" onClick={onClose}>
						取消
					</button>
					<button
						type="button"
						className="btn-ghost"
						onClick={() => void runScan()}
						disabled={scanning}
					>
						<ScanIcon size={13} />
						{scanning ? "扫描中…" : "重新扫描"}
					</button>
					<button
						type="button"
						className="btn-primary"
						onClick={() => void handleImport()}
						disabled={importing || selected.size === 0}
					>
						{importing ? "导入中…" : `导入 ${selected.size} 个`}
					</button>
				</>
			}
		>
			<div className="mb-3 flex gap-2">
				<input
					className="field font-mono"
					value={root}
					onChange={(event) => setRoot(event.target.value)}
					placeholder="~/mycode"
					spellCheck={false}
				/>
				<button type="button" className="btn-ghost shrink-0" onClick={handlePick}>
					<FolderIcon size={13} />
					选择
				</button>
			</div>

			<div className="min-h-[220px] overflow-hidden rounded-lg border border-line">
				{scanning && (
					<div className="flex h-[220px] items-center justify-center text-[12px] text-faint">
						正在扫描…
					</div>
				)}

				{!scanning && results.length === 0 && (
					<div className="flex h-[220px] flex-col items-center justify-center gap-1 px-6 text-center">
						<div className="text-[12px] text-muted">
							{scanned ? "没有找到可启动的项目" : "等待扫描"}
						</div>
						<div className="text-[11px] leading-relaxed text-faint">
							需要 package.json 中包含 dev / start / serve 脚本
						</div>
					</div>
				)}

				{!scanning &&
					results.map((candidate, index) => {
						const isSelected = selected.has(candidate.key);
						const disabled = candidate.alreadyAdded;
						return (
							<button
								key={candidate.key}
								type="button"
								disabled={disabled}
								onClick={() => toggle(candidate.key)}
								className={cn(
									"flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
									index !== 0 && "border-t border-line/70",
									disabled
										? "cursor-default opacity-45"
										: "hover:bg-white/[0.04]",
								)}
							>
								<span
									className={cn(
										"flex h-4 w-4 shrink-0 items-center justify-center rounded border",
										isSelected && !disabled
											? "border-white/70 bg-white/90 text-black"
											: "border-line bg-black/20",
									)}
								>
									{isSelected && !disabled && <CheckIcon size={10} />}
								</span>

								<span className="min-w-0 flex-1">
									<span className="flex items-center gap-2">
										<span className="truncate text-[12.5px] text-fg">
											{candidate.name}
										</span>
										{disabled && (
											<span className="rounded border border-line px-1 py-[1px] text-[9.5px] text-faint">
												已添加
											</span>
										)}
									</span>
									<span className="mt-0.5 block truncate font-mono text-[10.5px] text-faint">
										{candidate.cwd}
									</span>
								</span>

								<span className="shrink-0 text-right">
									<span className="block font-mono text-[10.5px] text-muted">
										{candidate.command}
									</span>
									<span className="mt-0.5 block font-mono text-[10px] text-faint">
										{candidate.port ? `:${candidate.port}` : "自动检测"}
									</span>
								</span>
							</button>
						);
					})}
			</div>

			{scanned && results.length > 0 && (
				<div className="mt-2 text-[10.5px] text-faint">
					共 {results.length} 个候选，{importable} 个可导入
				</div>
			)}
		</Modal>
	);
}
