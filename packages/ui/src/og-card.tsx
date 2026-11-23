/**
 * The 1200×630 social card shared by both apps (rendered by each app's opengraph-image.tsx with next/og). Inline styles
 * only: Satori supports a subset of CSS. Design: the landing hero (Verdigris ground, white display type, Golden
 * Pollen pill, the four-figure stat band).
 */
export const OG_SIZE = { width: 1200, height: 630 };

const C = { teal: "#0b7774", deep: "#053836", pollen: "#ffc93c", cream: "#fffaec", white: "#ffffff", ink: "#292929" };

export function OgCard({ eyebrow = "Built on Stellar · Powered by purpose", title, subtitle, stats }: { eyebrow?: string; title: string; subtitle: string; stats?: { label: string; value: string }[] }) {
	return (
		<div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: C.white, padding: 24 }}>
			<div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", background: C.teal, borderRadius: 24, padding: "48px 56px", color: C.white }}>
				<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
					<div style={{ fontSize: 40, letterSpacing: -1 }}>AidTrace</div>
					<div style={{ display: "flex", background: C.pollen, color: C.teal, borderRadius: 999, padding: "10px 22px", fontSize: 22 }}>Stellar Testnet</div>
				</div>
				<div style={{ display: "flex", flexDirection: "column" }}>
					<div style={{ fontSize: 76, lineHeight: 1.02, letterSpacing: -2, maxWidth: 940 }}>{title}</div>
					<div style={{ fontSize: 28, marginTop: 20, opacity: 0.9, maxWidth: 900 }}>{subtitle}</div>
				</div>
				<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 18, letterSpacing: 1, textTransform: "uppercase", opacity: 0.85 }}>
					<span>{eyebrow}</span>
				</div>
			</div>
			{stats && stats.length > 0 && (
				<div style={{ display: "flex", background: C.cream, borderRadius: 20, marginTop: 16, padding: "22px 40px", gap: 40 }}>
					{stats.map((s) => (
						<div key={s.label} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
							<span style={{ fontSize: 20, color: C.ink }}>{s.label}</span>
							<span style={{ fontSize: 40, color: C.teal, letterSpacing: -1 }}>{s.value}</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

/** The app icon (apple-touch-icon): graphite square with the white plus. */
export function IconMark({ size }: { size: number }) {
	return (
		<div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: C.ink }}>
			<div style={{ position: "relative", width: size * 0.42, height: size * 0.42, display: "flex" }}>
				<div style={{ position: "absolute", left: "45%", top: 0, width: "10%", height: "100%", background: C.white, borderRadius: 99 }} />
				<div style={{ position: "absolute", top: "45%", left: 0, height: "10%", width: "100%", background: C.white, borderRadius: 99 }} />
			</div>
		</div>
	);
}
