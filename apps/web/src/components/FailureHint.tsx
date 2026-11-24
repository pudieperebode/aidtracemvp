import { errorCode } from "@/lib/api/errors";

const FAUCET = "https://faucet.circle.com";

/**
 * The next step for the wallet/account problems the backend names by code (its error table): add test XLM, enable
 * USDC, get test USDC, or ask the beneficiary to set up their wallet. Null when there is nothing specific to do.
 */
export function failureHint(error: unknown): React.ReactNode {
	switch (errorCode(error)) {
		case "ACCOUNT_NOT_ACTIVE":
		case "INSUFFICIENT_XLM":
			return (
				<span className="mt-1 block">
					Your wallet needs test XLM for fees first: open the wallet menu (top right) and add test XLM.
				</span>
			);
		case "TRUSTLINE_MISSING":
			return (
				<span className="mt-1 block">
					Your wallet can&apos;t hold USDC yet: open the wallet menu (top right) and choose Enable USDC.
				</span>
			);
		case "INSUFFICIENT_BALANCE":
			return (
				<span className="mt-1 block">
					Get free test USDC from the{" "}
					<a href={FAUCET} target="_blank" rel="noreferrer" className="underline underline-offset-2">
						Circle faucet
					</a>{" "}
					(Stellar Testnet), then try again.
				</span>
			);
		case "RECIPIENT_NOT_ACTIVE":
		case "RECIPIENT_TRUSTLINE_MISSING":
			return (
				<span className="mt-1 block">The beneficiary must activate their wallet and enable USDC before they can be paid.</span>
			);
		case "TRANSACTION_EXPIRED":
		case "CAMPAIGN_CHANGED":
			return <span className="mt-1 block">Try again to prepare a fresh transaction.</span>;
		default:
			return null;
	}
}
