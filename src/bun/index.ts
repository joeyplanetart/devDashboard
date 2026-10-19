import { BrowserWindow, Updater, app } from "electrobun/main";
import { DATA_DIR } from "./config";
import { ProcessManager } from "./process-manager";
import { createAppRpc } from "./rpc";

const DEV_SERVER_URL = "http://localhost:5173";

/**
 * GUI apps inherit a minimal PATH. Ask the user's login shell once so tools
 * installed via nvm / bun / homebrew resolve when spawning dev servers.
 */
async function hydrateShellPath() {
	const shell = process.env.SHELL || "/bin/zsh";
	try {
		const proc = Bun.spawn(
			[shell, "-ilc", 'printf "\\n__DDB_PATH__%s\\n" "$PATH"'],
			{
				stdin: "ignore",
				stdout: "pipe",
				stderr: "ignore",
				env: { ...process.env, TERM: "dumb" },
			},
		);
		const output = await new Response(proc.stdout).text();
		await proc.exited;

		const marker = "__DDB_PATH__";
		const index = output.lastIndexOf(marker);
		if (index === -1) return;

		const value = output.slice(index + marker.length).split("\n")[0].trim();
		if (value.includes("/")) process.env.PATH = value;
	} catch {
		// Keep the inherited PATH.
	}
}

await hydrateShellPath();

async function getMainViewUrl(): Promise<string> {
	const channel = await Updater.localInfo.channel();
	if (channel === "dev") {
		try {
			await fetch(DEV_SERVER_URL, { method: "HEAD" });
			return DEV_SERVER_URL;
		} catch {
			console.log("Vite dev server not running, using bundled views.");
		}
	}
	return "views://mainview/index.html";
}

const manager = new ProcessManager();
const rpc = createAppRpc(manager);

const safeSend = (fn: () => void) => {
	try {
		fn();
	} catch {
		// Webview may not be attached yet.
	}
};

manager.onState = (states) => safeSend(() => rpc.send.state(states));
manager.onLogs = (id, lines) => safeSend(() => rpc.send.logs({ id, lines }));
manager.onToast = (toast) => safeSend(() => rpc.send.toast(toast));

const mainWindow = new BrowserWindow({
	title: "devDashboard",
	url: await getMainViewUrl(),
	frame: {
		width: 1180,
		height: 780,
		x: 120,
		y: 100,
	},
	titleBarStyle: "hiddenInset",
	rpc,
});

mainWindow.on("close", () => {
	manager.killAllSync();
});

app.on("beforeQuit", () => {
	manager.killAllSync();
});

process.on("exit", () => {
	manager.killAllSync();
});

console.log(
	"devDashboard started with",
	manager.getStates().length,
	"apps. Data:",
	DATA_DIR,
);
