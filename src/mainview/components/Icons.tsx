import type { ReactNode } from "react";

type IconProps = {
	size?: number;
	className?: string;
};

function Svg({
	size = 16,
	className,
	children,
}: IconProps & { children: ReactNode }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={1.7}
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
			aria-hidden="true"
		>
			{children}
		</svg>
	);
}

export function SearchIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<circle cx="11" cy="11" r="7" />
			<path d="m20 20-3.2-3.2" />
		</Svg>
	);
}

export function PlusIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="M12 5v14M5 12h14" />
		</Svg>
	);
}

export function FolderIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4l2 2h7A1.5 1.5 0 0 1 19 9.5v7A1.5 1.5 0 0 1 17.5 18h-13A1.5 1.5 0 0 1 3 16.5Z" />
		</Svg>
	);
}

export function PlayIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="M7 4.8v14.4L19 12Z" fill="currentColor" stroke="none" />
		</Svg>
	);
}

export function StopIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor" stroke="none" />
		</Svg>
	);
}

export function RestartIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="M20 11a8 8 0 1 0-2.3 6.3" />
			<path d="M20 4v7h-7" />
		</Svg>
	);
}

export function ExternalIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="M14 4h6v6" />
			<path d="M20 4 10 14" />
			<path d="M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" />
		</Svg>
	);
}

export function CopyIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<rect x="9" y="9" width="11" height="11" rx="2" />
			<path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
		</Svg>
	);
}

export function CheckIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="m5 12.5 4.5 4.5L19 7" />
		</Svg>
	);
}

export function CloseIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="M6 6l12 12M18 6 6 18" />
		</Svg>
	);
}

export function MoreIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
			<circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
			<circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
		</Svg>
	);
}

export function TrashIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="M4 7h16" />
			<path d="M10 4h4" />
			<path d="M6 7l1 12.5A1.5 1.5 0 0 0 8.5 21h7a1.5 1.5 0 0 0 1.5-1.5L18 7" />
			<path d="M10 11v6M14 11v6" />
		</Svg>
	);
}

export function PencilIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
			<path d="m13.5 6.5 3 3" />
		</Svg>
	);
}

export function TerminalIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<rect x="3" y="4" width="18" height="16" rx="2" />
			<path d="m7 9 3 3-3 3M13 15h4" />
		</Svg>
	);
}

export function ScanIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="M4 8V6a2 2 0 0 1 2-2h2" />
			<path d="M16 4h2a2 2 0 0 1 2 2v2" />
			<path d="M20 16v2a2 2 0 0 1-2 2h-2" />
			<path d="M8 20H6a2 2 0 0 1-2-2v-2" />
			<path d="M7 12h10" />
		</Svg>
	);
}

export function AlertIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="M12 4 3 20h18L12 4Z" />
			<path d="M12 10v4M12 17h.01" />
		</Svg>
	);
}

export function ChevronDownIcon(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="m6 9 6 6 6-6" />
		</Svg>
	);
}
