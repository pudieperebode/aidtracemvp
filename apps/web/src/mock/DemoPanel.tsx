"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FlaskConical, RotateCcw } from "lucide-react";
import { Button } from "@repo/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/popover";
import { Switch } from "@repo/ui/switch";
import { cn } from "@repo/ui/lib/utils";
import { useToast } from "@/lib/use-toast";
import { useMockControls } from "./controls";
import { resetMockDb } from "./store";

/**
 * Demo controls (mock mode only), bottom-left: simulate Stellar's speed, make the next transaction fail or the next
 * signature be declined, and reset the demo data. Lets the team walk every success and failure path before the
 * backend exists.
 */
export function DemoPanel() {
	const queryClient = useQueryClient();
	const toast = useToast();
	const speed = useMockControls((s) => s.speed);
	const failNext = useMockControls((s) => s.failNext);
	const declineNext = useMockControls((s) => s.declineNext);
	const setSpeed = useMockControls((s) => s.setSpeed);
	const setFailNext = useMockControls((s) => s.setFailNext);
	const setDeclineNext = useMockControls((s) => s.setDeclineNext);
	const [confirmReset, setConfirmReset] = useState(false);
	const armed = failNext || declineNext;

	return (
		<Popover onOpenChange={() => setConfirmReset(false)}>
			<PopoverTrigger
				className={cn(
					"fixed bottom-4 left-4 z-30 flex h-9 lg:right-5 lg:bottom-5 lg:left-auto cursor-pointer items-center gap-2 rounded-full border border-line bg-white px-3.5 text-xs shadow-[0_10px_30px_-12px_rgba(14,14,14,0.35)] transition-colors hover:bg-field",
					armed && "border-pollen bg-pollen-soft",
				)}
				aria-label="Demo controls"
			>
				<FlaskConical className="size-3.5" aria-hidden />
				Demo
				{armed && <span className="animate-signal size-1.5 rounded-full bg-pollen-deep text-pollen-deep" aria-hidden />}
			</PopoverTrigger>
			<PopoverContent
				side="top"
				align="end"
				sideOffset={10}
				className="w-[300px] rounded-card border-line bg-white p-4 shadow-[0_24px_60px_-20px_rgba(14,14,14,0.3)]"
			>
				<p className="text-[13px]">Demo controls</p>
				<p className="caption mt-1">
					Simulated data, wallet and Stellar Testnet. Switch to live mode with NEXT_PUBLIC_DATA_MODE=live.
				</p>

				<fieldset className="mt-4">
					<legend className="text-xs">Network speed</legend>
					<div className="mt-2 grid grid-cols-2 gap-1 rounded-control bg-field p-1">
						{(["fast", "realistic"] as const).map((s) => (
							<button
								key={s}
								type="button"
								aria-pressed={speed === s}
								onClick={() => setSpeed(s)}
								className={cn(
									"h-7 cursor-pointer rounded-[4px] text-xs capitalize transition-colors",
									speed === s ? "bg-white shadow-sm" : "text-muted hover:text-ink",
								)}
							>
								{s === "realistic" ? "Realistic (~5 s)" : "Fast"}
							</button>
						))}
					</div>
				</fieldset>

				<div className="mt-4 flex flex-col gap-3">
					<label className="flex cursor-pointer items-start justify-between gap-3">
						<span>
							<span className="block text-xs">Fail the next transaction</span>
							<span className="caption">Submitted, then rejected on chain. Nothing is deducted.</span>
						</span>
						<Switch checked={failNext} onCheckedChange={setFailNext} />
					</label>
					<label className="flex cursor-pointer items-start justify-between gap-3">
						<span>
							<span className="block text-xs">Decline the next signature</span>
							<span className="caption">As if you pressed Reject in the wallet.</span>
						</span>
						<Switch checked={declineNext} onCheckedChange={setDeclineNext} />
					</label>
				</div>

				<div className="mt-4 border-t border-line pt-4">
					{confirmReset ? (
						<div className="flex items-center justify-between gap-2">
							<span className="text-xs">Restore the original demo data?</span>
							<Button
								size="sm"
								variant="reject"
								onClick={() => {
									resetMockDb();
									queryClient.clear();
									setConfirmReset(false);
									toast.success("Demo data reset");
								}}
							>
								Reset
							</Button>
						</div>
					) : (
						<Button size="sm" variant="outline" className="w-full" onClick={() => setConfirmReset(true)}>
							<RotateCcw /> Reset demo data
						</Button>
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}
