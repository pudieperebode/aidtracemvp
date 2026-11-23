"use client";

import { CircleCheckIcon, InfoIcon, OctagonXIcon, TriangleAlertIcon } from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { Spinner } from "./spinner";

/** Toasts in the AidTrace look: white card, graphite text, Verdigris / Autumn Leaf accents; bottom-centre on phones. */
const Toaster = ({ ...props }: ToasterProps) => {
	return (
		<Sonner
			className="toaster group"
			icons={{
				success: <CircleCheckIcon className="size-[18px] text-success" />,
				info: <InfoIcon className="size-[18px] text-ink" />,
				warning: <TriangleAlertIcon className="size-[18px] text-pollen-dark" />,
				error: <OctagonXIcon className="size-[18px] text-danger" />,
				loading: <Spinner className="size-[18px] text-brand" />,
			}}
			toastOptions={{
				classNames: {
					toast: "!rounded-card !border-line !bg-white !font-sans !text-ink !shadow-[0_18px_40px_-16px_rgba(14,14,14,0.28)] !gap-3 !py-3.5",
					title: "!text-[13px] !font-normal !tracking-[-0.01em]",
					description: "!text-xs !text-muted",
					actionButton: "!rounded-control !bg-ink !px-3 !text-xs !text-white",
					cancelButton: "!rounded-control !bg-field !text-ink",
				},
			}}
			style={
				{
					"--normal-bg": "#ffffff",
					"--normal-text": "#292929",
					"--normal-border": "#eaeaea",
					"--border-radius": "8px",
				} as React.CSSProperties
			}
			{...props}
		/>
	);
};

export { Toaster };
export { toast } from "sonner";
export type { ExternalToast } from "sonner";
