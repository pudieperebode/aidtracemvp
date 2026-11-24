"use client";

import { AnimatedNumber } from "@repo/ui/animated-number";

const SCALE = 10_000_000n;

/**
 * A headline USD(C) amount that counts up on first view ("$72,000"). The exact value renders first (no-JS, reduced
 * motion); only the animation passes through a float, the displayed final value comes from integer maths.
 */
export function CountUpUsd({ stroops, cents = false }: { stroops: string | bigint; cents?: boolean }) {
	const value = BigInt(stroops);
	const whole = Number(value / SCALE) + Number(value % SCALE) / 1e7;
	const showCents = cents || value % SCALE !== 0n;
	return (
		<AnimatedNumber
			value={whole}
			format={(n) =>
				`$${n.toLocaleString("en-US", { minimumFractionDigits: showCents ? 2 : 0, maximumFractionDigits: showCents ? 2 : 0 })}`
			}
		/>
	);
}

export function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
	return <AnimatedNumber value={value} format={(n) => `${Math.round(n).toLocaleString("en-US")}${suffix}`} />;
}
