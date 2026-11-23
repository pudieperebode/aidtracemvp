"use client";

import { useEffect } from "react";
import { AidTraceWordmark } from "@repo/ui/brand";

/** Something on the page threw (Next 16 passes `retry`). */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
	useEffect(() => {
		console.error(error);
	}, [error]);

	return (
		<div className="flex min-h-dvh flex-col p-2 sm:p-[15px]">
			<main className="flex flex-1 flex-col rounded-panel bg-brand-dark px-5 py-6 text-white sm:px-10">
				<AidTraceWordmark />
				<div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
					<h1 className="h-landing">Something interrupted the page</h1>
					<p className="mt-4 max-w-[440px] text-base opacity-90">This section hit a problem. Try again, or come back in a moment.</p>
					{error.digest && <p className="mt-2 font-mono text-xs opacity-70">Reference {error.digest}</p>}
					<button type="button" onClick={retry} className="mt-10 inline-flex h-12 cursor-pointer items-center rounded-full bg-pollen px-6 text-brand-dark">
						Try again
					</button>
				</div>
			</main>
		</div>
	);
}
