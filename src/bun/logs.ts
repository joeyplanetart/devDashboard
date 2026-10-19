import type { LogLine, LogStream } from "../shared/types";

const MAX_LINES = 5000;

const ANSI_PATTERN =
	// CSI sequences (colors, cursor movement, clear line, progress bars)
	/\x1b\[[0-9;?]*[ -/]*[@-~]|\x1b\][^\x07]*(?:\x07|\x1b\\)|\x1b[@-_]/g;

export function stripAnsi(text: string): string {
	return text.replace(ANSI_PATTERN, "");
}

export class LogBuffer {
	private lines: LogLine[] = [];
	private seq = 0;

	append(stream: LogStream, raw: string): LogLine | null {
		const text = stripAnsi(raw).replace(/\r$/, "");
		if (text.length === 0 && stream !== "system") return null;

		const line: LogLine = {
			seq: ++this.seq,
			ts: Date.now(),
			stream,
			text,
		};

		this.lines.push(line);
		if (this.lines.length > MAX_LINES) {
			this.lines.splice(0, this.lines.length - MAX_LINES);
		}
		return line;
	}

	since(afterSeq = 0, limit = MAX_LINES): LogLine[] {
		if (afterSeq >= this.seq) return [];
		const start = this.lines.findIndex((line) => line.seq > afterSeq);
		if (start === -1) return [];
		return this.lines.slice(start, start + limit);
	}

	tail(count: number): string[] {
		return this.lines.slice(-count).map((line) => line.text);
	}

	clear(): void {
		this.lines = [];
	}

	get lastSeq(): number {
		return this.seq;
	}
}
