/** Brand copy for metadata. */
const SITE_NAME = "AidTrace";
const SITE_TAGLINE = "One source. Every gift. A clear impact.";
const SITE_DESCRIPTION =
	"AidTrace connects generosity to real change. Organizations fund campaigns, approve beneficiaries and send USDC on Stellar; every confirmed payment tells a story of real support, with private details kept off-chain. Live on Stellar Testnet.";

const SITE_KEYWORDS = ["AidTrace", "aid distribution", "humanitarian aid", "NGO", "nonprofit", "donation transparency", "public ledger", "Stellar", "USDC", "Stellar Testnet"];

const THEME_COLOR = "#ffffff";

const TWITTER_HANDLE = "@aidtrace";

const IS_PRODUCTION = process.env.NEXT_PUBLIC_VERCEL_ENV === "production";
const PRODUCTION_HOST = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;

/**
 * Absolute URL of this site, for `metadataBase` / canonical / robots / sitemap: NEXT_PUBLIC_SITE_URL → the project's
 * production domain in production → the deployment URL on Vercel previews → localhost in dev.
 */
const SITE_URL = new URL(
	process.env.NEXT_PUBLIC_SITE_URL ??
		(IS_PRODUCTION && PRODUCTION_HOST ? `https://${PRODUCTION_HOST}` : undefined) ??
		(process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ??
		"http://localhost:3002",
);

/**
 * The app (`apps/web`): `/app` on the shared Vercel host, its own port in dev. Links into it are plain
 * <a>s: a <Link> would route inside this landing app.
 */
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? (process.env.NODE_ENV === "development" ? "http://localhost:3000" : "/app");

const APP_LINKS = {
	overview: `${APP_URL}/overview`,
	campaigns: `${APP_URL}/campaigns`,
	campaign: (reference: string) => `${APP_URL}/campaigns/${encodeURIComponent(reference)}`,
	ledger: `${APP_URL}/ledger`,
	createCampaign: `${APP_URL}/campaigns/new`,
	beneficiaries: `${APP_URL}/beneficiaries`,
};

/**
 * The backend, for server-side reads (featured campaigns, transparency stats). Server-to-server, so no proxy is
 * needed. PROVISIONAL paths, as in apps/web/src/lib/api/endpoints.ts.
 */
const API_URL = process.env.AIDTRACE_API_URL ?? (process.env.API_PROXY_TARGET ? `${process.env.API_PROXY_TARGET}/v1` : "http://localhost:4000/v1");

export { SITE_NAME, SITE_TAGLINE, SITE_DESCRIPTION, SITE_KEYWORDS, THEME_COLOR, TWITTER_HANDLE, SITE_URL, APP_URL, APP_LINKS, API_URL };
