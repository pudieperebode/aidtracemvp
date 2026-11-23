import { BrandLoader } from "@repo/ui/brand";

export default function Loading() {
	return (
		<div className="flex min-h-dvh items-center justify-center bg-white">
			<BrandLoader label="Loading AidTrace" />
		</div>
	);
}
