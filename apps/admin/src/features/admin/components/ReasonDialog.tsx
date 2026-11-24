"use client";

import { useState } from "react";
import { Button } from "@repo/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@repo/ui/dialog";
import { Field, Textarea } from "@repo/ui/field";

/** A confirmation that needs a written reason or note (suspend a user, resolve an issue). */
export function ReasonDialog({
	open,
	onOpenChange,
	title,
	description,
	label,
	placeholder,
	confirm,
	tone = "primary",
	pending,
	onConfirm,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: React.ReactNode;
	label: string;
	placeholder?: string;
	confirm: string;
	tone?: "primary" | "danger";
	pending?: boolean;
	onConfirm: (text: string) => void;
}) {
	const [value, setValue] = useState("");
	const [touched, setTouched] = useState(false);
	const error = touched && !value.trim() ? `${label} is required.` : undefined;
	const close = (next: boolean) => {
		if (pending) return;
		if (!next) {
			setValue("");
			setTouched(false);
		}
		onOpenChange(next);
	};
	return (
		<Dialog open={open} onOpenChange={close}>
			<DialogContent className="gap-0 rounded-panel border-0 bg-white p-6 sm:max-w-[460px]">
				<DialogTitle className="text-lg font-normal">{title}</DialogTitle>
				<DialogDescription className="mt-2 text-xs leading-5 text-muted">{description}</DialogDescription>
				<form
					noValidate
					className="mt-5"
					onSubmit={(e) => {
						e.preventDefault();
						setTouched(true);
						if (value.trim()) onConfirm(value.trim());
					}}
				>
					<Field label={label} htmlFor="reason" error={error}>
						<Textarea
							id="reason"
							rows={3}
							value={value}
							placeholder={placeholder}
							invalid={!!error}
							onChange={(e) => setValue(e.target.value)}
						/>
					</Field>
					<div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
						<Button type="button" variant="outline" size="lg" onClick={() => close(false)} disabled={pending}>
							Cancel
						</Button>
						<Button type="submit" variant={tone} size="lg" isLoading={pending} loadingText="Saving…">
							{confirm}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
