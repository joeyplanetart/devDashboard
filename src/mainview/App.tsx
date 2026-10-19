import { useEffect, useMemo, useRef, useState } from "react";
import type { AppInput } from "../shared/types";
import { AppFormDialog } from "./components/AppFormDialog";
import { AppHeader } from "./components/AppHeader";
import { ConfirmDeleteDialog } from "./components/ConfirmDeleteDialog";
import { EmptyState } from "./components/EmptyState";
import { FailureBanner } from "./components/FailureBanner";
import { LogConsole } from "./components/LogConsole";
import { PortPanel } from "./components/PortPanel";
import { ScanDialog } from "./components/ScanDialog";
import { Sidebar } from "./components/Sidebar";
import { Toasts } from "./components/Toasts";
import { useDashboard } from "./hooks/useDashboard";

type Dialog =
	| { kind: "add" }
	| { kind: "edit"; id: string }
	| { kind: "scan" }
	| { kind: "delete"; id: string }
	| null;

export default function App() {
	const dash = useDashboard();
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [dialog, setDialog] = useState<Dialog>(null);
	const pendingSelectRef = useRef<string | null>(null);

	const {
		apps,
		logs,
		toasts,
		ready,
		loadLogs,
		startApp,
		stopApp,
		restartApp,
		clearLogs,
		addApp,
		updateApp,
		removeApp,
		openUrl,
		revealPath,
		pickDirectory,
		scanDirectory,
		checkPort,
	} = dash;

	useEffect(() => {
		if (apps.length === 0) {
			setSelectedId(null);
			return;
		}

		if (selectedId && apps.some((app) => app.id === selectedId)) return;

		const pending = pendingSelectRef.current;
		if (pending && apps.some((app) => app.id === pending)) {
			setSelectedId(pending);
			pendingSelectRef.current = null;
			return;
		}

		if (!pending) setSelectedId(apps[0].id);
	}, [apps, selectedId]);

	useEffect(() => {
		if (selectedId) void loadLogs(selectedId);
	}, [selectedId, loadLogs]);

	const selected = useMemo(
		() => apps.find((app) => app.id === selectedId) ?? null,
		[apps, selectedId],
	);

	const selectedLogs = selectedId ? (logs[selectedId] ?? []) : [];

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (dialog) return;
			const target = event.target as HTMLElement | null;
			if (
				target &&
				(target.tagName === "INPUT" ||
					target.tagName === "TEXTAREA" ||
					target.isContentEditable)
			) {
				return;
			}
			if (!selected) return;

			const meta = event.metaKey || event.ctrlKey;
			if (!meta) return;

			if (event.key === "Enter") {
				event.preventDefault();
				if (selected.status === "running" || selected.status === "starting") {
					void restartApp(selected.id);
				} else {
					void startApp(selected.id);
				}
			}

			if (event.key === ".") {
				event.preventDefault();
				void stopApp(selected.id);
			}
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [dialog, selected, startApp, stopApp, restartApp]);

	const handleAdd = async (input: AppInput) => {
		const result = await addApp(input);
		if (result.id) {
			pendingSelectRef.current = result.id;
			setSelectedId(result.id);
		}
		return result;
	};

	const editing =
		dialog?.kind === "edit"
			? (apps.find((app) => app.id === dialog.id) ?? null)
			: null;
	const deleting =
		dialog?.kind === "delete"
			? (apps.find((app) => app.id === dialog.id) ?? null)
			: null;

	return (
		<div className="flex h-screen overflow-hidden bg-bg text-fg">
			<Sidebar
				apps={apps}
				selectedId={selectedId}
				onSelect={setSelectedId}
				onAdd={() => setDialog({ kind: "add" })}
				onScan={() => setDialog({ kind: "scan" })}
				loading={!ready}
			/>

			<main className="flex min-w-0 flex-1 flex-col">
				{selected ? (
					<>
						<AppHeader
							app={selected}
							onStart={() => void startApp(selected.id)}
							onStop={() => void stopApp(selected.id)}
							onRestart={() => void restartApp(selected.id)}
							onOpen={() => {
								if (selected.url) void openUrl(selected.url);
							}}
							onEdit={() => setDialog({ kind: "edit", id: selected.id })}
							onReveal={() => void revealPath(selected.cwd)}
							onDelete={() => setDialog({ kind: "delete", id: selected.id })}
						/>

						<PortPanel
							app={selected}
							onOpen={(url) => void openUrl(url)}
						/>

						{selected.status === "failed" && selected.failure && (
							<FailureBanner
								failure={selected.failure}
								onRetry={() => void restartApp(selected.id)}
							/>
						)}

						<LogConsole
							key={selected.id}
							lines={selectedLogs}
							onClear={() => void clearLogs(selected.id)}
						/>
					</>
				) : (
					<EmptyState
						hasApps={apps.length > 0}
						onAdd={() => setDialog({ kind: "add" })}
						onScan={() => setDialog({ kind: "scan" })}
					/>
				)}
			</main>

			<Toasts toasts={toasts} />

			{dialog?.kind === "add" && (
				<AppFormDialog
					mode="add"
					onClose={() => setDialog(null)}
					onSubmit={handleAdd}
					pickDirectory={pickDirectory}
					checkPort={checkPort}
				/>
			)}

			{dialog?.kind === "edit" && editing && (
				<AppFormDialog
					mode="edit"
					initial={editing}
					onClose={() => setDialog(null)}
					onSubmit={(input) => updateApp(editing.id, input)}
					pickDirectory={pickDirectory}
					checkPort={checkPort}
				/>
			)}

			{dialog?.kind === "scan" && (
				<ScanDialog
					onClose={() => setDialog(null)}
					scanDirectory={scanDirectory}
					pickDirectory={pickDirectory}
					addApp={handleAdd}
				/>
			)}

			{dialog?.kind === "delete" && deleting && (
				<ConfirmDeleteDialog
					name={deleting.name}
					onClose={() => setDialog(null)}
					onConfirm={() => {
						const id = deleting.id;
						setDialog(null);
						void removeApp(id);
					}}
				/>
			)}
		</div>
	);
}
