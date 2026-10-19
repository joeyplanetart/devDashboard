import { existsSync, readdirSync, readFileSync, statSync, type Dirent } from "node:fs";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";
import type { ScanCandidate } from "../shared/types";

const MAX_DEPTH = 2;
const MAX_RESULTS = 120;

const SKIP_DIRS = new Set([
	"node_modules",
	".git",
	".hg",
	".svn",
	"dist",
	"build",
	"out",
	".next",
	".nuxt",
	".output",
	".turbo",
	".cache",
	"coverage",
	"vendor",
	"target",
	"Library",
	".Trash",
]);

type PackageJson = {
	name?: string;
	scripts?: Record<string, string>;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
};

function readPackageJson(path: string): PackageJson | null {
	try {
		return JSON.parse(readFileSync(path, "utf8")) as PackageJson;
	} catch {
		return null;
	}
}

function detectPackageManager(dir: string): "bun" | "pnpm" | "yarn" | "npm" {
	if (existsSync(join(dir, "bun.lock")) || existsSync(join(dir, "bun.lockb"))) {
		return "bun";
	}
	if (existsSync(join(dir, "pnpm-lock.yaml"))) return "pnpm";
	if (existsSync(join(dir, "yarn.lock"))) return "yarn";
	return "npm";
}

function buildCommand(
	manager: "bun" | "pnpm" | "yarn" | "npm",
	script: string,
): string {
	switch (manager) {
		case "bun":
			return `bun run ${script}`;
		case "pnpm":
			return `pnpm ${script}`;
		case "yarn":
			return `yarn ${script}`;
		case "npm":
			return `npm run ${script}`;
	}
}

function guessPort(
	dir: string,
	commandText: string,
	pkg: PackageJson,
): number | undefined {
	const flagMatch = commandText.match(/(?:--port[= ]|-p\s+)(\d{2,5})\b/);
	if (flagMatch) return Number(flagMatch[1]);

	for (const file of [
		"vite.config.ts",
		"vite.config.js",
		"vite.config.mjs",
		"nuxt.config.ts",
		"next.config.js",
		"next.config.mjs",
	]) {
		const path = join(dir, file);
		if (!existsSync(path)) continue;
		try {
			const source = readFileSync(path, "utf8");
			const match = source.match(/\bport\s*:\s*(\d{2,5})\b/);
			if (match) return Number(match[1]);
		} catch {
			// Ignore unreadable config.
		}
	}

	for (const file of [".env", ".env.local", ".env.development"]) {
		const path = join(dir, file);
		if (!existsSync(path)) continue;
		try {
			const source = readFileSync(path, "utf8");
			const match = source.match(/^\s*PORT\s*=\s*(\d{2,5})\s*$/m);
			if (match) return Number(match[1]);
		} catch {
			// Ignore unreadable env file.
		}
	}

	const deps = { ...pkg.dependencies, ...pkg.devDependencies };
	if (deps.next) return 3000;
	if (deps.nuxt) return 3000;
	if (deps.vite) return 5173;
	return undefined;
}

function readCandidate(
	dir: string,
	existingCwds: Set<string>,
): ScanCandidate | null {
	const pkg = readPackageJson(join(dir, "package.json"));
	if (!pkg?.scripts) return null;

	const script = ["dev", "start", "serve"].find(
		(name) => typeof pkg.scripts?.[name] === "string",
	);
	if (!script) return null;

	const manager = detectPackageManager(dir);
	const command = buildCommand(manager, script);
	const resolvedDir = resolve(dir);
	const name =
		(pkg.name ?? "").split("/").pop()?.trim() || basename(resolvedDir);

	return {
		key: resolvedDir,
		name,
		cwd: resolvedDir,
		command,
		script,
		port: guessPort(dir, pkg.scripts[script] ?? "", pkg),
		alreadyAdded: existingCwds.has(resolvedDir),
	};
}

export function scanDirectory(
	root: string,
	existingCwds: Iterable<string>,
): ScanCandidate[] {
	const expanded = root.startsWith("~")
		? root.replace(/^~(?=$|[/\\])/, homedir())
		: root;
	const resolvedRoot = resolve(expanded);
	if (!existsSync(resolvedRoot)) return [];

	try {
		if (!statSync(resolvedRoot).isDirectory()) return [];
	} catch {
		return [];
	}

	const existing = new Set([...existingCwds].map((cwd) => resolve(cwd)));
	const results: ScanCandidate[] = [];
	const seen = new Set<string>();

	const walk = (dir: string, depth: number) => {
		if (results.length >= MAX_RESULTS) return;

		const candidate = readCandidate(dir, existing);
		if (candidate && !seen.has(candidate.key)) {
			seen.add(candidate.key);
			results.push(candidate);
		}

		if (depth >= MAX_DEPTH) return;

		let entries: Dirent[];
		try {
			entries = readdirSync(dir, { withFileTypes: true });
		} catch {
			return;
		}

		for (const entry of entries) {
			if (results.length >= MAX_RESULTS) return;
			if (!entry.isDirectory()) continue;
			if (entry.name.startsWith(".") || SKIP_DIRS.has(entry.name)) continue;
			walk(join(dir, entry.name), depth + 1);
		}
	};

	walk(resolvedRoot, 0);

	return results.sort((a, b) => a.name.localeCompare(b.name));
}
