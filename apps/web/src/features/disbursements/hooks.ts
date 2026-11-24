"use client";

import { useCallback, useRef, useState } from "react";
import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { ChainActionDto } from "@/lib/api/dto";
import { listAllocations } from "@/lib/api/endpoints";
import { errorMessage, isStillPending, isWalletRejection } from "@/lib/api/errors";
import {
	cancelAllocation,
	createAllocations,
	fundCampaign,
	lockAllocations,
	payout,
	type ActionStage,
	type Signer,
} from "@/lib/api/flows";
import type { TxStage } from "@/lib/tx";
import { useWalletStore } from "@/features/wallet/store";
import { signerFor } from "@/features/wallet/signer";

/** Every money view a transaction can change. The backend owns state: refetch, never guess. */
export function invalidateMoney(queryClient: QueryClient, campaign?: string) {
	const keys: unknown[][] = [
		["campaigns"],
		["public-campaigns"],
		["public-campaign"],
		["public-stats"],
		["ledger"],
		["wallet"],
		["notifications"],
	];
	if (campaign) keys.push(["campaign", campaign], ["beneficiaries", campaign], ["allocations", campaign]);
	for (const queryKey of keys) void queryClient.invalidateQueries({ queryKey });
}

function useSigner() {
	const address = useWalletStore((s) => s.address);
	const walletId = useWalletStore((s) => s.walletId);
	return useCallback(() => {
		if (!address) throw new Error("Connect the administrator wallet first.");
		return signerFor(address, walletId);
	}, [address, walletId]);
}

type MoneyAction<V> = (signer: Signer, vars: V, onStage: (stage: ActionStage) => void) => Promise<ChainActionDto | void>;

/**
 * Runs one wallet-signed money action with `TxProgress` stages, then refreshes every money view. `confirmed` only
 * once the backend reports it confirmed on Stellar (never on submit alone); `pending` when it is still settling.
 */
export function useOnChain<V>(campaign: string | undefined, action: MoneyAction<V>) {
	const queryClient = useQueryClient();
	const getSigner = useSigner();
	const [stage, setStage] = useState<TxStage>("idle");
	const [result, setResult] = useState<{ hash: string | null; explorerUrl: string | null }>({ hash: null, explorerUrl: null });

	const mutation = useMutation({
		mutationFn: async (vars: V) => {
			setResult({ hash: null, explorerUrl: null });
			setStage("signing");
			const done = await action(getSigner(), vars, setStage);
			if (done) setResult({ hash: done.hash, explorerUrl: done.explorerUrl });
			return done;
		},
		onSuccess: () => setStage("confirmed"),
		onError: (error) => setStage(isWalletRejection(error) ? "rejected" : isStillPending(error) ? "pending" : "failed"),
		onSettled: () => invalidateMoney(queryClient, campaign),
	});

	const reset = useCallback(() => {
		setStage("idle");
		setResult({ hash: null, explorerUrl: null });
		mutation.reset();
	}, [mutation]);

	return { ...mutation, stage, hash: result.hash, explorerUrl: result.explorerUrl, reset };
}

export const useFundCampaign = (campaign: string) =>
	useOnChain<{ amount: string }>(campaign, (signer, v, onStage) => fundCampaign(api, campaign, v.amount, signer, onStage));

/** Cancels an unpaid allocation: at once when unlocked, with a wallet signature when its funds are already locked. */
export const useCancelAllocation = (campaign: string) =>
	useOnChain<{ allocationId: string }>(campaign, (signer, v, onStage) =>
		cancelAllocation(api, campaign, v.allocationId, signer, onStage),
	);

// --- Batch payouts (Deliverable 2 "Batch processing": sequential multi-beneficiary payouts) ----------------------------

export interface PayoutItem {
	beneficiaryId: string;
	reference: string;
	/** Decimal USDC. */
	amount: string;
	/** The beneficiary's live allocation, if it already has one. */
	allocation: { id: string; status: "allocated" | "ready" | "failed" } | null;
}

export type ItemState =
	| { status: "queued" }
	| { status: "allocating" }
	| { status: "locking"; step: ActionStage }
	| { status: "signing" | "submitting" }
	| { status: "confirmed"; hash: string; explorerUrl: string | null }
	| { status: "failed"; message: string }
	| { status: "pending"; message: string }
	| { status: "rejected" }
	| { status: "skipped" };

const LOCK_SIZE = 20;
const ALLOCATE_SIZE = 100;
const chunks = <T>(list: T[], size: number) =>
	Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, i * size + size));

/**
 * Pays the selected beneficiaries: allocate the ones without an allocation (one call, no signature), lock the
 * allocations into escrow (one signature per 20), then execute each payout in turn (one signature each, because each
 * uses the wallet's next sequence number). A failed payout doesn't stop the others; declining in the wallet, or a
 * payout still confirming, stops the run and nothing more is sent.
 */
export function useBatchPayout(campaign: string) {
	const queryClient = useQueryClient();
	const getSigner = useSigner();
	const [items, setItems] = useState<PayoutItem[]>([]);
	const [states, setStates] = useState<Record<string, ItemState>>({});
	const [running, setRunning] = useState(false);
	const cancelled = useRef(false);

	const run = useCallback(
		async (batch: PayoutItem[]) => {
			const current: Record<string, ItemState> = Object.fromEntries(
				batch.map((i) => [i.beneficiaryId, { status: "queued" } as ItemState]),
			);
			const set = (ids: string[], state: ItemState) => {
				for (const id of ids) current[id] = state;
				setStates({ ...current });
			};
			setItems(batch);
			setStates({ ...current });
			setRunning(true);
			cancelled.current = false;
			let stop = false;
			const allocation = new Map(batch.map((i) => [i.beneficiaryId, i.allocation]));

			try {
				const signer = getSigner();

				// 1. Allocate (off-chain, all or nothing per call).
				const fresh = batch.filter((i) => !i.allocation);
				for (const group of chunks(fresh, ALLOCATE_SIZE)) {
					const ids = group.map((i) => i.beneficiaryId);
					set(ids, { status: "allocating" });
					try {
						let created = await createAllocations(
							api,
							campaign,
							group.map((i) => ({ beneficiaryId: i.beneficiaryId, amount: i.amount })),
						);
						if (!created.length)
							created = (await listAllocations(api, campaign)).filter(
								(a) => ids.includes(a.beneficiary_id) && a.status === "allocated",
							);
						for (const a of created) allocation.set(a.beneficiary_id, { id: a.id, status: "allocated" });
						set(ids, { status: "queued" });
					} catch (error) {
						set(ids, { status: "failed", message: errorMessage(error) });
					}
				}
				invalidateMoney(queryClient, campaign);

				// 2. Lock into escrow ("Ready for payment").
				const toLock = batch.filter(
					(i) => allocation.get(i.beneficiaryId)?.status === "allocated" && current[i.beneficiaryId]?.status === "queued",
				);
				for (const group of chunks(toLock, LOCK_SIZE)) {
					const ids = group.map((i) => i.beneficiaryId);
					if (stop || cancelled.current) {
						set(ids, { status: "skipped" });
						continue;
					}
					set(ids, { status: "locking", step: "signing" });
					try {
						await lockAllocations(
							api,
							campaign,
							group.map((i) => allocation.get(i.beneficiaryId)!.id),
							signer,
							(step) => set(ids, { status: "locking", step }),
						);
						for (const id of ids) allocation.set(id, { id: allocation.get(id)!.id, status: "ready" });
						set(ids, { status: "queued" });
					} catch (error) {
						if (isWalletRejection(error)) {
							set(ids, { status: "rejected" });
							stop = true;
						} else if (isStillPending(error)) {
							set(ids, { status: "pending", message: errorMessage(error) });
							stop = true;
						} else set(ids, { status: "failed", message: errorMessage(error) });
					}
					invalidateMoney(queryClient, campaign);
				}

				// 3. Pay, one at a time.
				for (const item of batch) {
					const id = item.beneficiaryId;
					const a = allocation.get(id);
					if (current[id]?.status !== "queued" || !a) continue;
					if (stop || cancelled.current) {
						set([id], { status: "skipped" });
						continue;
					}
					set([id], { status: "signing" });
					try {
						const done = await payout(api, campaign, a.id, signer, (step) => set([id], { status: step }));
						set([id], { status: "confirmed", hash: done.hash, explorerUrl: done.explorerUrl });
					} catch (error) {
						if (isWalletRejection(error)) {
							set([id], { status: "rejected" });
							stop = true;
						} else if (isStillPending(error)) {
							set([id], { status: "pending", message: errorMessage(error) });
							stop = true; // never move on (or pay again) while the outcome is unknown
						} else set([id], { status: "failed", message: errorMessage(error) });
					}
					invalidateMoney(queryClient, campaign);
				}
			} catch (error) {
				// No signer (wallet disconnected): nothing was sent.
				for (const i of batch)
					if (current[i.beneficiaryId]?.status === "queued")
						current[i.beneficiaryId] = { status: "failed", message: errorMessage(error) };
				setStates({ ...current });
			} finally {
				for (const i of batch)
					if (current[i.beneficiaryId]?.status === "queued") current[i.beneficiaryId] = { status: "skipped" };
				setStates({ ...current });
				setRunning(false);
				invalidateMoney(queryClient, campaign);
			}
		},
		[campaign, getSigner, queryClient],
	);

	const reset = useCallback(() => {
		setItems([]);
		setStates({});
	}, []);

	const values = Object.values(states);
	const summary = {
		confirmed: values.filter((s) => s.status === "confirmed").length,
		failed: values.filter((s) => s.status === "failed").length,
		pending: values.filter((s) => s.status === "pending").length,
		skipped: values.filter((s) => s.status === "skipped" || s.status === "rejected").length,
	};

	return { run, items, states, running, reset, summary, cancel: () => (cancelled.current = true) };
}
