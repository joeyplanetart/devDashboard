import type { RPCSchema } from "electrobun/main";

export type AppStatus =
	| "stopped"
	| "starting"
	| "running"
	| "stopping"
	| "failed";

export type LogStream = "stdout" | "stderr" | "system";

export type AppConfig = {
	id: string;
	name: string;
	cwd: string;
	command: string;
	port?: number;
	env?: Record<string, string>;
	autoStart?: boolean;
};

export type AppInput = {
	name: string;
	cwd: string;
	command: string;
	port?: number;
	env?: Record<string, string>;
	autoStart?: boolean;
};

export type FailureInfo = {
	reason: string;
	hint?: string;
};

export type RuntimeState = {
	id: string;
	name: string;
	cwd: string;
	command: string;
	env?: Record<string, string>;
	autoStart?: boolean;
	/** Port currently listening (may be detected from logs). */
	port?: number;
	/** Port configured by the user. */
	configuredPort?: number;
	status: AppStatus;
	portReady: boolean;
	pid?: number;
	url?: string;
	startedAt?: number;
	exitCode?: number | null;
	failure?: FailureInfo;
	cwdExists: boolean;
};

export type LogLine = {
	seq: number;
	ts: number;
	stream: LogStream;
	text: string;
};

export type ScanCandidate = {
	key: string;
	name: string;
	cwd: string;
	command: string;
	script: string;
	port?: number;
	alreadyAdded: boolean;
};

export type PortOwner = {
	pid: number;
	command: string;
};

export type PortCheck = {
	port: number;
	free: boolean;
	owner?: PortOwner;
};

export type ActionResult = {
	ok: boolean;
	error?: string;
};

export type ToastPayload = {
	kind: "info" | "success" | "error";
	message: string;
};

export type AppRPC = {
	bun: RPCSchema<{
		requests: {
			listApps: { params: {}; response: RuntimeState[] };
			getLogs: {
				params: { id: string; afterSeq?: number; limit?: number };
				response: { lines: LogLine[]; lastSeq: number };
			};
			startApp: { params: { id: string }; response: ActionResult };
			stopApp: { params: { id: string }; response: ActionResult };
			restartApp: { params: { id: string }; response: ActionResult };
			clearLogs: { params: { id: string }; response: ActionResult };
			addApp: { params: { input: AppInput }; response: ActionResult & { id?: string } };
			updateApp: {
				params: { id: string; input: AppInput };
				response: ActionResult;
			};
			removeApp: { params: { id: string }; response: ActionResult };
			checkPort: { params: { port: number }; response: PortCheck };
			openUrl: { params: { url: string }; response: ActionResult };
			revealPath: { params: { path: string }; response: ActionResult };
			pickDirectory: {
				params: { startingFolder?: string };
				response: { path?: string };
			};
			scanDirectory: {
				params: { root: string };
				response: ScanCandidate[];
			};
		};
		messages: {
			appReady: {};
		};
	}>;
	webview: RPCSchema<{
		requests: {};
		messages: {
			state: RuntimeState[];
			logs: { id: string; lines: LogLine[] };
			toast: ToastPayload;
		};
	}>;
};
