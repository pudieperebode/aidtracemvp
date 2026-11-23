"use client";

import { useCallback, useRef, useState } from "react";
import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { errorMessage, isWalletRejection } from "@/lib/api/errors";
import { allocate, cancelAllocation, disburse, fundCampaign, type Signer } from "@/lib/api/flows";
import type { TxStage } from "@/lib/tx";
import { useWalletStore } from "@/features/wallet/store";
import { signerFor } from "@/features/wallet/signer";

/** Every money view a transaction can change. */
export function invalidateMoney(queryClient: QueryClient, campaignId?: string) {
	const keys: unknown[][] = [["campaigns"], ["public-campaigns"], ["public-campaign"], ["public-stats"], ["ledger"], ["wallet"], ["notifications"]];
	if (campaignId) keys.push(["campaign", campaignId], ["beneficiaries", campaignId], ["reconciliation", campaignId]);
	for (const queryKey of keys) void queryClient.invalidateQueries({ queryKey });
}

/** Wraps the wallet signer so the UI learns when the signature is given (→ "Submitting"). */
function staged(signer: Signer, onSigned: () => void): Signer {
	return {
		address: signer.address,
		sign: async (xdr, passphrase) => {
			const signed = await signer.sign(xdr, passphrase);
			onSigned();
			return signed;
		},
	};
}

function useSigner() {
	const address = useWalletStore((s) => s.address);
	const walletId = useWalletStore((s) => s.walletId);
	return useCallback(() => {
		if (!address) throw new Error("Connect the administrator wallet first.");
		return signerFor(address, walletId);
	}, [address, walletId]);
}

type OnChainAction<V> = (signer: Signer, vars: V) => Promise<{ hash: string }>;

/**
 * Runs one wallet-signed contract action with `TxProgress` stages, then refreshes every money view.
 * `confirmed` only after the backend verified the transaction (never on submit alone).
 */
export function useOnChain<V>(campaignId: string | undefined, action: OnChainAction<V>) {
	const queryClient = useQueryClient();
	const getSigner = useSigner();
	const [stage, setStage] = useState<TxStage>("idle");
	const [hash, setHash] = useState<string | null>(null);

	const mutation = useMutation({
		mutationFn: async (vars: V) => {
			setHash(null);
			setStage("signing");
			const result = await action(
				staged(getSigner(), () => setStage("submitting")),
				vars,
			);
			setHash(result.hash);
			return result;
		},
		onSuccess: () => setStage("confirmed"),
		onError: (error) => setStage(isWalletRejection(error) ? "rejected" : "failed"),
		onSettled: () => invalidateMoney(queryClient, campaignId),
	});

	const reset = useCallback(() => {
		setStage("idle");
		setHash(null);
		mutation.reset();
	}, [mutation]);

	return { ...mutation, stage, hash, reset };
}

export const useFundCampaign = (campaignId: string) => useOnChain<{ amount: string }>(campaignId, (signer, v) => fundCampaign(api, campaignId, v.amount, signer));

export const useCancelAllocation = (campaignId: string) =>
	useOnChain<{ beneficiaryId: string }>(campaignId, (signer, v) => cancelAllocation(api, campaignId, v.beneficiaryId, signer));

// --- Batch payouts (Deliverable 2 "Batch processing": sequential multi-beneficiary payouts) ----------------------------

export interface PayoutItem {
	beneficiaryId: string;
	reference: string;
	/** Decimal USDC. */
	amount: string;
	/** Allocate (or change the allocation) before paying. */
	allocate: boolean;
}

export type ItemState =
	| { status: "queued" }
	| { status: "allocating" | "signing" | "submitting" }
	| { status: "confirmed"; hash: string }
	| { status: "failed"; message: string; hash?: string }
	| { status: "rejected" }
	| { status: "skipped" };

/**
 * Pays each selected beneficiary in turn: allocation (when needed) then payout, each signed by the administrator
 * wallet. A failure on one beneficiary doesn't stop the others; declining in the wallet stops the batch (the rest are
 * skipped, nothing more is sent).
 */
export function useBatchPayout(campaignId: string) {
	const queryClient = useQueryClient();
	const getSigner = useSigner();
	const [items, setItems] = useState<PayoutItem[]>([]);
	const [states, setStates] = useState<Record<string, ItemState>>({});
	const [running, setRunning] = useState(false);
	const cancelled = useRef(false);

	const set = (id: string, state: ItemState) => setStates((s) => ({ ...s, [id]: state }));

	const run = useCallback(
		async (batch: PayoutItem[]) => {
			setItems(batch);
			setStates(Object.fromEntries(batch.map((i) => [i.beneficiaryId, { status: "queued" } as ItemState])));
			setRunning(true);
			cancelled.current = false;
			let stop = false;
			for (const item of batch) {
				if (stop || cancelled.current) {
					set(item.beneficiaryId, { status: "skipped" });
					continue;
				}
				try {
					const signer = getSigner();
					if (item.allocate) {
						set(item.beneficiaryId, { status: "allocating" });
						await allocate(api, campaignId, item.beneficiaryId, item.amount, signer);
					}
					set(item.beneficiaryId, { status: "signing" });
					const { hash } = await disburse(api, campaignId, item.beneficiaryId, staged(signer, () => set(item.beneficiaryId, { status: "submitting" })));
					set(item.beneficiaryId, { status: "confirmed", hash });
				} catch (error) {
					if (isWalletRejection(error)) {
						set(item.beneficiaryId, { status: "rejected" });
						stop = true;
					} else set(item.beneficiaryId, { status: "failed", message: errorMessage(error) });
				}
				invalidateMoney(queryClient, campaignId);
			}
			setRunning(false);
		},
		[campaignId, getSigner, queryClient],
	);

	const reset = useCallback(() => {
		setItems([]);
		setStates({});
	}, []);

	const summary = {
		confirmed: Object.values(states).filter((s) => s.status === "confirmed").length,
		failed: Object.values(states).filter((s) => s.status === "failed").length,
		skipped: Object.values(states).filter((s) => s.status === "skipped" || s.status === "rejected").length,
	};

	return { run, items, states, running, reset, summary, cancel: () => (cancelled.current = true) };
}
