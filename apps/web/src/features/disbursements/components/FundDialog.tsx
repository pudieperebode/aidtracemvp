"use client";

import { useState } from "react";
import { Button } from "@repo/ui/button";
import { AffixInput, Field } from "@repo/ui/field";
import { DetailRow } from "@repo/ui/surface";
import { toStroops } from "@repo/stellar/format";
import { remainingToTarget } from "@repo/stellar/money";
import type { CampaignTotals } from "@repo/stellar/campaign";
import { fixed2, usdc } from "@/lib/format";
import { useToast } from "@/lib/use-toast";
import { TxDialog } from "@/components/TxDialog";
import { explorerAction } from "@/components/ExplorerButton";
import { useWalletBalances } from "@/features/wallet/hooks";
import { useFundCampaign } from "@/features/disbursements/hooks";
import { usdcAmount } from "@/features/campaigns/schema";

/** Fund the campaign escrow with Testnet USDC from the administrator wallet (Deliverable 2 "Campaign funding"). */
export function FundDialog({
	open,
	onOpenChange,
	campaign,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	campaign: { title: string; reference: string; totals: CampaignTotals };
}) {
	const fund = useFundCampaign(campaign.reference);
	const balances = useWalletBalances();
	const toast = useToast();
	const [amount, setAmount] = useState("");
	const [touched, setTouched] = useState(false);

	const parsed = usdcAmount.safeParse(amount);
	const tooMuch = parsed.success && balances.data?.usdc != null && toStroops(amount) > BigInt(balances.data.usdc);
	const tooSmall = parsed.success && toStroops(amount) < 10_000_000n;
	const noTrustline = balances.data?.usdc === null;
	const error =
		touched &&
		(!parsed.success
			? parsed.error.issues[0]?.message
			: tooSmall
				? "Fund at least 1 USDC."
				: tooMuch
					? "That's more than your wallet holds."
					: undefined);
	const remaining = remainingToTarget(campaign.totals);

	const close = (next: boolean) => {
		onOpenChange(next);
		if (!next) {
			fund.reset();
			setAmount("");
			setTouched(false);
		}
	};

	const submit = () => {
		setTouched(true);
		if (!parsed.success || tooMuch || tooSmall) return;
		fund.mutate(
			{ amount: parsed.data },
			{
				onSuccess: (done) =>
					toast.success(`${fixed2(toStroops(amount))} USDC added to ${campaign.title}`, {
						action: explorerAction(done?.hash, done?.explorerUrl),
					}),
				onError: () => toast.error("Funding didn't complete", { description: "No USDC left your wallet." }),
			},
		);
	};

	return (
		<TxDialog
			open={open}
			onOpenChange={close}
			title="Fund campaign"
			description={`Lock Testnet USDC from your administrator wallet in the ${campaign.reference} escrow on Stellar. Your wallet signs; AidTrace submits it.`}
			stage={fund.stage}
			error={fund.error}
			hash={fund.hash}
			explorerUrl={fund.explorerUrl}
			successTitle="Campaign funded"
			successBody="The deposit is recorded on Stellar and on the public ledger."
			onRetry={() => fund.reset()}
		>
			<form
				noValidate
				onSubmit={(e) => {
					e.preventDefault();
					submit();
				}}
			>
				<Field
					label="Amount"
					htmlFor="fund-amount"
					error={error}
					hint={balances.data?.usdc != null ? `Wallet balance: ${usdc(balances.data.usdc)}` : undefined}
				>
					<AffixInput
						id="fund-amount"
						inputMode="decimal"
						placeholder="0.00"
						autoFocus
						value={amount}
						invalid={!!error}
						onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
						onBlur={() => setTouched(true)}
						trailing="USDC"
					/>
				</Field>
				{noTrustline && (
					<p className="mt-2 text-xs text-accent-dark">
						Your wallet can&apos;t hold USDC yet. Open the wallet menu (top right) and choose Enable USDC first.
					</p>
				)}
				{BigInt(remaining) > 0n && (
					<button
						type="button"
						className="mt-2 cursor-pointer text-xs text-brand-dark hover:underline"
						onClick={() => setAmount(fixed2(remaining).replace(/,/g, ""))}
					>
						Fill remaining to target ({usdc(remaining)})
					</button>
				)}
				<dl className="mt-5 flex flex-col gap-2.5 rounded-card bg-page p-3.5">
					<DetailRow label="Raised so far" value={usdc(campaign.totals.raised)} />
					<DetailRow label="Funding target" value={usdc(campaign.totals.target)} />
					<DetailRow label="Network" value="Stellar Testnet" />
				</dl>
				<div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
					<Button type="button" variant="outline" size="lg" onClick={() => close(false)}>
						Cancel
					</Button>
					<Button type="submit" variant="accent" size="lg">
						Fund campaign
					</Button>
				</div>
			</form>
		</TxDialog>
	);
}
