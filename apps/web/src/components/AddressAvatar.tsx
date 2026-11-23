import { cn } from "@repo/ui/lib/utils";

const PALETTE = ["#0e9f9a", "#ffc93c", "#6a4cc7", "#b4e1e0", "#f26a1b", "#053836", "#fbd1b8"];

/**
 * A deterministic avatar from the wallet address (the design's photo avatar implies a profile AidTrace doesn't
 * have). Same address, same colours, everywhere.
 */
export function AddressAvatar({ address, className }: { address: string; className?: string }) {
	let hash = 0;
	for (const char of address) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
	const a = PALETTE[hash % PALETTE.length];
	const b = PALETTE[(hash >>> 8) % PALETTE.length];
	const angle = hash % 360;
	return (
		<span
			aria-hidden
			className={cn("inline-block shrink-0 rounded-full", className)}
			style={{ background: `conic-gradient(from ${angle}deg, ${a}, ${b}, ${a})` }}
		/>
	);
}
