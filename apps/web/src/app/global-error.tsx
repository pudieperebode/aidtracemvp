"use client";

/** The root layout itself failed: a bare page in brand colours (no app styles are guaranteed here). */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
	return (
		<html lang="en">
			<body style={{ fontFamily: "'Instrument Sans', system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, padding: 16, background: "#f6f6f6", color: "#292929" }}>
				<div style={{ textAlign: "center", maxWidth: 440 }}>
					<svg width="40" height="40" viewBox="0 0 26 26" aria-hidden>
						<rect width="26" height="26" rx="5" fill="#292929" />
						<path d="M13 7.5v11M7.5 13h11" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
					</svg>
					<h1 style={{ fontSize: 24, fontWeight: 400, letterSpacing: "-0.02em", margin: "20px 0 8px" }}>AidTrace couldn’t load</h1>
					<p style={{ color: "#6b6b6b", margin: 0, fontSize: 13, lineHeight: 1.6 }}>Campaign funds are held by the contract and are not affected. Try again in a moment.</p>
					{error.digest && <p style={{ color: "#9a9a9a", fontSize: 12, fontFamily: "monospace" }}>Reference {error.digest}</p>}
					<button type="button" onClick={retry} style={{ marginTop: 24, padding: "11px 22px", borderRadius: 5, border: 0, background: "#292929", color: "#fff", fontSize: 14, cursor: "pointer" }}>
						Try again
					</button>
				</div>
			</body>
		</html>
	);
}
