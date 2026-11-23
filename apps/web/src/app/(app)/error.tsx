"use client";

import { useEffect } from "react";
import { ErrorScreen } from "@/components/ErrorScreen";

/** A screen threw: keep the shell, replace only the content. */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
	useEffect(() => {
		console.error(error);
	}, [error]);

	return <ErrorScreen retry={retry} digest={error.digest} inline />;
}
