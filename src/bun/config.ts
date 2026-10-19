import {
	existsSync,
	mkdirSync,
	readFileSync,
	renameSync,
	writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { Utils } from "electrobun/main";
import type { AppConfig } from "../shared/types";

function resolveDataDir(): string {
	try {
		return Utils.paths.userData;
	} catch {
		return join(homedir(), "Library", "Application Support", "devDashboard");
	}
}

export const DATA_DIR = resolveDataDir();
export const CONFIG_PATH = join(DATA_DIR, "apps.json");

function sanitize(value: unknown): AppConfig | null {
	if (!value || typeof value !== "object") return null;
	const raw = value as Record<string, unknown>;

	const id = typeof raw.id === "string" ? raw.id.trim() : "";
	const name = typeof raw.name === "string" ? raw.name.trim() : "";
	const cwd = typeof raw.cwd === "string" ? raw.cwd.trim() : "";
	const command =
		typeof raw.command === "string" ? raw.command.trim() : "";

	if (!id || !name || !cwd || !command) return null;

	const portValue = raw.port;
	const port =
		typeof portValue === "number" &&
		Number.isInteger(portValue) &&
		portValue > 0 &&
		portValue < 65536
			? portValue
			: undefined;

	let env: Record<string, string> | undefined;
	if (raw.env && typeof raw.env === "object" && !Array.isArray(raw.env)) {
		const entries = Object.entries(raw.env as Record<string, unknown>)
			.filter(([, v]) => typeof v === "string")
			.map(([k, v]) => [k, v as string]);
		if (entries.length > 0) env = Object.fromEntries(entries);
	}

	return { id, name, cwd, command, port, env, autoStart: raw.autoStart === true };
}

export function loadApps(): AppConfig[] {
	if (!existsSync(CONFIG_PATH)) return [];

	try {
		const parsed = JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as unknown;
		const list = Array.isArray(parsed)
			? parsed
			: Array.isArray((parsed as { apps?: unknown })?.apps)
				? (parsed as { apps: unknown[] }).apps
				: [];

		return list
			.map(sanitize)
			.filter((item): item is AppConfig => item !== null);
	} catch {
		try {
			renameSync(CONFIG_PATH, `${CONFIG_PATH}.corrupt-${Date.now()}`);
		} catch {
			// Ignore: the file is unusable either way.
		}
		return [];
	}
}

export function saveApps(apps: AppConfig[]): void {
	mkdirSync(DATA_DIR, { recursive: true });
	const tmpPath = `${CONFIG_PATH}.tmp`;
	const payload = JSON.stringify({ version: 1, apps }, null, "\t");

	writeFileSync(tmpPath, payload, "utf8");
	renameSync(tmpPath, CONFIG_PATH);
}
