import { connect } from "node:net";
import type { PortOwner } from "../shared/types";

/**
 * Find the process listening on a TCP port. Returns undefined when the port is
 * free or lsof is unavailable.
 */
export async function getPortOwner(port: number): Promise<PortOwner | undefined> {
	if (!Number.isInteger(port) || port <= 0 || port > 65535) return undefined;

	const proc = Bun.spawn(
		["lsof", "-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-Fpc"],
		{ stdout: "pipe", stderr: "ignore" },
	);

	const output = await new Response(proc.stdout).text();
	await proc.exited;

	let pid: number | undefined;
	for (const line of output.split("\n")) {
		if (line.startsWith("p")) {
			const value = Number(line.slice(1));
			pid = Number.isFinite(value) ? value : undefined;
		} else if (line.startsWith("c") && pid !== undefined) {
			return { pid, command: line.slice(1) || "unknown" };
		}
	}

	return undefined;
}

/** TCP-level check that something accepts connections on 127.0.0.1:port. */
export function isPortListening(port: number, timeoutMs = 400): Promise<boolean> {
	return new Promise((resolve) => {
		const socket = connect({ host: "127.0.0.1", port });
		let settled = false;

		const finish = (value: boolean) => {
			if (settled) return;
			settled = true;
			socket.destroy();
			resolve(value);
		};

		socket.setTimeout(timeoutMs);
		socket.once("connect", () => finish(true));
		socket.once("error", () => finish(false));
		socket.once("timeout", () => finish(false));
	});
}

export async function checkPort(port: number): Promise<{
	port: number;
	free: boolean;
	owner?: PortOwner;
}> {
	const owner = await getPortOwner(port);
	if (owner) return { port, free: false, owner };

	const listening = await isPortListening(port);
	return { port, free: !listening };
}

const URL_PORT_PATTERN =
	/https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[[0-9a-fA-F:]+\]):(\d{2,5})/i;
const LOCALHOST_PORT_PATTERN =
	/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)\s*[:：]\s*(\d{2,5})\b/i;
const LISTEN_PATTERN =
	/(?:listening|listening on|serve|serving|started|running).{0,40}?(?:port|:)\s*(\d{2,5})\b/i;
const PORT_FLAG_PATTERN = /(?:--port[= ]|-p\s+)(\d{2,5})\b/i;

/** Best-effort extraction of a dev server port from a log line. */
export function detectPortFromLine(line: string): number | undefined {
	for (const pattern of [
		URL_PORT_PATTERN,
		LOCALHOST_PORT_PATTERN,
		LISTEN_PATTERN,
		PORT_FLAG_PATTERN,
	]) {
		const match = line.match(pattern);
		if (!match) continue;
		const port = Number(match[1]);
		if (!Number.isInteger(port) || port < 1 || port > 65535) continue;
		return port;
	}
	return undefined;
}

export async function waitForPort(
	port: number,
	timeoutMs: number,
	intervalMs = 400,
): Promise<boolean> {
	const startedAt = Date.now();
	while (Date.now() - startedAt < timeoutMs) {
		if (await isPortListening(port)) return true;
		await new Promise((resolve) => setTimeout(resolve, intervalMs));
	}
	return false;
}
