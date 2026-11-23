"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";
import { cn } from "./lib/utils";

/** A side drawer (the app sidebar on phones and tablets). Focus-trapped, closes on Escape / overlay / link. */
export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;
export const SheetTitle = DialogPrimitive.Title;

export function SheetContent({ className, children, side = "left", ...props }: React.ComponentProps<typeof DialogPrimitive.Content> & { side?: "left" | "right" }) {
	return (
		<DialogPrimitive.Portal>
			<DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/40" />
			<DialogPrimitive.Content
				aria-describedby={undefined}
				className={cn(
					"data-[state=open]:animate-in data-[state=closed]:animate-out fixed inset-y-0 z-50 flex w-[min(300px,86vw)] flex-col bg-white shadow-xl duration-300 outline-none",
					side === "left" ? "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left left-0" : "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right right-0",
					className,
				)}
				{...props}
			>
				{children}
				<DialogPrimitive.Close className="absolute top-4 right-4 flex size-8 cursor-pointer items-center justify-center rounded-control text-ink hover:bg-field" aria-label="Close menu">
					<XIcon className="size-4" />
				</DialogPrimitive.Close>
			</DialogPrimitive.Content>
		</DialogPrimitive.Portal>
	);
}
