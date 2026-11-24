"use client";

import { Copy, LogOut } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/popover";
import { shortKey } from "@/lib/stellar/config";
import { useToast } from "@/lib/use-toast";
import { fixed2 } from "@/lib/format";
import { useSignOut } from "@/features/auth/hooks";
import { useWalletStore } from "@/features/wallet/store";
import { useWalletBalances } from "@/features/wallet/hooks";
import { WalletIcon } from "@/features/wallet/components/WalletIcon";
import { WalletSetup } from "@/features/wallet/components/WalletSetup";
import { AddressAvatar } from "@/components/AddressAvatar";

/** The signed-in "Admin" button: short address; opens the wallet, its Testnet balances and sign-out. */
export function WalletMenu() {
	const address = useWalletStore((s) => s.address);
	const walletId = useWalletStore((s) => s.walletId);
	const signOut = useSignOut();
	const toast = useToast();
	const balances = useWalletBalances();
	if (!address) return null;

	return (
		<Popover>
			<PopoverTrigger className="flex h-[29px] cursor-pointer items-center gap-2 rounded-control bg-ink pr-3 pl-1 text-xs text-white transition-colors hover:bg-night">
				<AddressAvatar address={address} className="size-[21px] rounded-[4px]" />
				<span>Admin · {shortKey(address)}</span>
			</PopoverTrigger>
			<PopoverContent
				align="end"
				sideOffset={10}
				className="w-[300px] rounded-card border-line bg-white p-4 shadow-[0_24px_60px_-20px_rgba(14,14,14,0.3)]"
			>
				<div className="flex items-center gap-3">
					<WalletIcon id={walletId ?? "freighter"} className="size-9" />
					<div className="min-w-0">
						<p className="text-[13px]">{walletId === "demo" ? "Demo administrator wallet" : "Administrator wallet"}</p>
						<p className="caption">Stellar Testnet</p>
					</div>
				</div>
				<p className="mt-3 rounded-control bg-page p-2.5 font-mono text-[11px] break-all text-muted">{address}</p>
				{balances.data && (
					<dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
						<div className="rounded-control bg-page p-2.5">
							<dt className="caption">Wallet USDC</dt>
							<dd className="mt-1 tabular-nums">{balances.data.usdc === null ? "Not enabled" : fixed2(balances.data.usdc)}</dd>
						</div>
						<div className="rounded-control bg-page p-2.5">
							<dt className="caption">Wallet XLM</dt>
							<dd className="mt-1 tabular-nums">{fixed2(balances.data.xlm)}</dd>
						</div>
					</dl>
				)}
				<WalletSetup compact className="mt-3 rounded-control border border-line p-2.5" />
				<div className="mt-3 flex flex-col">
					<button
						type="button"
						onClick={async () => {
							await navigator.clipboard.writeText(address);
							toast.success("Address copied");
						}}
						className="flex h-9 cursor-pointer items-center gap-3 rounded-control px-2 text-left text-xs hover:bg-field"
					>
						<Copy className="size-3.5" aria-hidden /> Copy address
					</button>
					<button
						type="button"
						onClick={async () => {
							await signOut();
							toast.info("Signed out", {
								description: "Campaign funds stay in escrow on Stellar. Public pages remain available.",
							});
						}}
						className="flex h-9 cursor-pointer items-center gap-3 rounded-control px-2 text-left text-xs text-accent-dark hover:bg-accent-soft"
					>
						<LogOut className="size-3.5" aria-hidden /> Sign out
					</button>
				</div>
			</PopoverContent>
		</Popover>
	);
}
