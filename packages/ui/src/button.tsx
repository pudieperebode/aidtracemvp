import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./lib/utils";
import { Spinner } from "./spinner";

/**
 * Buttons from the AidTrace frames (radius 5). `primary` (graphite) is the default action ("Register beneficiary",
 * "Execute payment"), `accent` (Autumn Leaf) the page CTA ("Create campaign"), `outline` the white secondary,
 * `approve` / `reject` the soft table actions. `pill` / `pill-brand` / `pill-pollen` are the landing's round CTAs.
 * `isLoading` keeps the width, shows a spinner and swaps in `loadingText` so the user sees what they wait on.
 */
const buttonVariants = cva(
	"relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-control font-normal tracking-[-0.01em] transition-[background-color,color,box-shadow,transform,border-color] duration-200 ease-(--ease-settle) outline-none select-none active:scale-[0.98] disabled:pointer-events-none focus-visible:ring-[3px] focus-visible:ring-brand/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
	{
		variants: {
			variant: {
				primary: "bg-ink text-white hover:bg-night disabled:bg-line-strong disabled:text-muted",
				accent: "bg-accent text-white hover:bg-accent-dark disabled:bg-accent-tint disabled:text-white",
				outline: "border border-line bg-white text-ink hover:bg-field disabled:text-subtle",
				ghost: "text-ink hover:bg-field disabled:text-subtle",
				approve: "bg-brand-soft text-brand-deep hover:bg-brand-tint disabled:opacity-50",
				reject: "bg-accent-soft text-accent-deep hover:bg-accent-tint disabled:opacity-50",
				danger: "bg-danger text-white hover:bg-danger/90 disabled:bg-line disabled:text-muted",
				link: "h-auto rounded-none px-0 text-ink underline-offset-4 hover:underline",
				pill: "rounded-full bg-brand-deep text-white hover:bg-night",
				"pill-brand": "rounded-full bg-brand-dark text-white hover:bg-brand-deep",
				"pill-pollen": "rounded-full bg-pollen text-brand-dark hover:bg-[#ffd666]",
				"pill-soft": "rounded-full bg-brand-soft text-brand-dark hover:bg-brand-tint",
			},
			size: {
				sm: "h-8 px-3 text-xs",
				md: "h-9 px-4 text-xs sm:text-[13px]",
				lg: "h-11 px-5 text-sm",
				xl: "h-[52px] px-6 text-base sm:h-[60px] sm:text-lg",
				icon: "size-9",
			},
		},
		defaultVariants: { variant: "primary", size: "md" },
	},
);

function Button({
	className,
	variant,
	size,
	isLoading = false,
	loadingText,
	asChild = false,
	children,
	disabled,
	...props
}: React.ComponentProps<"button"> &
	VariantProps<typeof buttonVariants> & {
		isLoading?: boolean;
		loadingText?: string;
		asChild?: boolean;
	}) {
	const Comp = asChild ? Slot : "button";

	return (
		<Comp
			data-slot="button"
			className={cn(buttonVariants({ variant, size }), isLoading && "cursor-progress", className)}
			disabled={isLoading || disabled}
			aria-busy={isLoading || undefined}
			{...props}
		>
			{isLoading && !asChild ? (
				<>
					<Spinner className="size-3.5" />
					<span>{loadingText ?? children}</span>
				</>
			) : (
				children
			)}
		</Comp>
	);
}

/** The landing's round arrow badge inside pill CTAs ("Explore campaigns ↗"). */
function ArrowBadge({ className }: { className?: string }) {
	return (
		<span aria-hidden className={cn("flex size-9 items-center justify-center rounded-full bg-pollen text-brand-deep transition-transform duration-300 ease-(--ease-settle) group-hover:rotate-45 sm:size-11", className)}>
			<svg viewBox="0 0 16 16" className="size-4" fill="none">
				<path d="M5 11 11 5M6 5h5v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
			</svg>
		</span>
	);
}

export { Button, buttonVariants, ArrowBadge };
