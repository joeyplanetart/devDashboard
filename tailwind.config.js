/** @type {import('tailwindcss').Config} */
export default {
	content: ["./src/mainview/**/*.{html,js,ts,jsx,tsx}"],
	theme: {
		extend: {
			colors: {
				bg: "#0A0A0B",
				panel: "#111113",
				raised: "#161618",
				line: "#1F1F22",
				fg: "#EDEDED",
				muted: "#8B8B93",
				faint: "#5B5B63",
				green: "#22C55E",
				amber: "#F59E0B",
				red: "#EF4444",
				cyan: "#22D3EE",
			},
			fontFamily: {
				sans: [
					"-apple-system",
					"BlinkMacSystemFont",
					"SF Pro Text",
					"Helvetica Neue",
					"PingFang SC",
					"sans-serif",
				],
				mono: ["SF Mono", "ui-monospace", "Menlo", "Monaco", "monospace"],
			},
		},
	},
	plugins: [],
};
