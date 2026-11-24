/** Brand copy for the root layout's metadata. */
const SITE_NAME = "AidTrace";
const SITE_TAGLINE = "Transparent aid distribution on Stellar";
const SITE_DESCRIPTION =
	"AidTrace connects generosity to real change. Organizations run aid campaigns, approve beneficiaries and pay out USDC from escrow on Stellar, while donors follow every payment on a public, privacy-safe ledger.";

const SITE_KEYWORDS = [
	"AidTrace",
	"aid distribution",
	"humanitarian",
	"NGO",
	"transparency",
	"public ledger",
	"Stellar",
	"USDC",
	"Stellar Testnet",
];

const TWITTER_HANDLE = "@aidtrace";

/** Browser chrome colour on mobile. Update with the design guide. */
const THEME_COLOR = "#ffffff";

/** Brand colours for generated images (OG cards, icons): Verdigris dark, Golden Pollen, Graphite. */
const BRAND = { teal: "#0b7774", deep: "#053836", pollen: "#ffc93c", ink: "#292929", page: "#f6f6f6" };

/** Read through next.config `env`, so client components agree with the server render. */
const IS_PRODUCTION = process.env.NEXT_PUBLIC_VERCEL_ENV === "production";

/** Vercel's production domain for this project (set automatically on Vercel), shared with the landing site. */
const PRODUCTION_ORIGIN = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL
	? `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`
	: undefined;

/**
 * Absolute site URL for `metadataBase`: NEXT_PUBLIC_SITE_URL → the project's production domain in production → the
 * deployment URL on Vercel previews → localhost in dev. The base path (`/app`) is added below.
 */
const ORIGIN =
	process.env.NEXT_PUBLIC_SITE_URL ??
	(IS_PRODUCTION ? PRODUCTION_ORIGIN : undefined) ??
	(process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ??
	"http://localhost:3000";

/** This app's base path: `/app` on every Vercel deployment, empty in dev (next.config.ts). */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Prefix app-local assets when this app is mounted below the site root (previews). */
function withBasePath(src: string) {
	return BASE_PATH && src.startsWith("/") && !src.startsWith(`${BASE_PATH}/`) ? `${BASE_PATH}${src}` : src;
}

/** Includes the base path, so previews resolve metadata URLs under `/app`. */
const SITE_URL = new URL(`${BASE_PATH}/`, ORIGIN);

/** The landing site (`apps/landing`). Link to it with a plain <a>. */
const LANDING_URL =
	process.env.NEXT_PUBLIC_LANDING_URL ??
	(IS_PRODUCTION || process.env.NODE_ENV !== "development" ? "/" : "http://localhost:3002");

export {
	SITE_NAME,
	SITE_TAGLINE,
	SITE_DESCRIPTION,
	SITE_KEYWORDS,
	TWITTER_HANDLE,
	THEME_COLOR,
	BRAND,
	SITE_URL,
	BASE_PATH,
	withBasePath,
	LANDING_URL,
};
