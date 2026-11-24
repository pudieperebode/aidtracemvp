import Link from "next/link";
import { Button } from "@repo/ui/button";

export default function NotFound() {
	return (
		<main className="flex min-h-dvh flex-col items-center justify-center bg-page px-6 text-center">
			<p className="label">404</p>
			<h1 className="h-page mt-3">This page doesn&apos;t exist</h1>
			<Button asChild className="mt-6">
				<Link href="/">Back to the console</Link>
			</Button>
		</main>
	);
}
