"use client";

import { Button } from "@repo/ui/button";

/** Next 16 error boundaries get `retry()`. */
export default function Error({ retry }: { error: Error; retry: () => void }) {
	return (
		<main className="flex min-h-dvh flex-col items-center justify-center bg-page px-6 text-center">
			<h1 className="h-page">Something went wrong</h1>
			<p className="caption mt-3 max-w-[380px]">
				The console hit an unexpected problem. No funds are affected: the console can&apos;t move money.
			</p>
			<Button className="mt-6" onClick={retry}>
				Try again
			</Button>
		</main>
	);
}
