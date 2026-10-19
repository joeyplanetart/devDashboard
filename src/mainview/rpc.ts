import { Electroview } from "electrobun/view";
import type {
	AppRPC,
	LogLine,
	RuntimeState,
	ToastPayload,
} from "../shared/types";

export type RpcHandlers = {
	onState: (states: RuntimeState[]) => void;
	onLogs: (id: string, lines: LogLine[]) => void;
	onToast: (toast: ToastPayload) => void;
};

let handlers: RpcHandlers = {
	onState: () => {},
	onLogs: () => {},
	onToast: () => {},
};

const rpc = Electroview.defineRPC<AppRPC>({
	maxRequestTime: 120_000,
	handlers: {
		requests: {},
		messages: {
			state: (states) => handlers.onState(states),
			logs: ({ id, lines }) => handlers.onLogs(id, lines),
			toast: (toast) => handlers.onToast(toast),
		},
	},
});

export const view = new Electroview({ rpc });
export const api = rpc.request;
export const send = rpc.send;

export function setRpcHandlers(next: RpcHandlers) {
	handlers = next;
}
