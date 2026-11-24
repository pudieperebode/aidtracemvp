import type { NextConfig } from "next";

/**
 * The platform-admin console. On Vercel it is a service of the repo-root `vercel.json`, served under `/admin` on the
 * same host as the landing site (`/`) and the organization app (`/app`). Dev serves it at the root of localhost:3001.
 * Set ADMIN_BASE_PATH="" once it has its own domain.
 */
const BASE_PATH = process.env.ADMIN_BASE_PATH ?? (process.env.VERCEL ? "/admin" : "");

/** The AidTrace backend (separate repo), including its `/api` prefix: its routes sit under `/v1`. */
const API_ORIGIN = process.env.API_PROXY_TARGET || "http://localhost:4000";

/** The browser calls this app's own `/api/v1`, proxied to the backend below, so CORS never applies. */
const API_URL = process.env.NEXT_PUBLIC_API_URL || `${BASE_PATH}/api/v1`;

const nextConfig: NextConfig = {
	basePath: BASE_PATH,
	env: {
		NEXT_PUBLIC_BASE_PATH: BASE_PATH,
		NEXT_PUBLIC_API_URL: API_URL,
		NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV ?? "",
	},
	distDir: process.env.NEXT_DIST_DIR || ".next",
	reactCompiler: true,
	devIndicators: { position: "bottom-right" },
	transpilePackages: ["@repo/ui", "@repo/stellar"],
	allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],
	async rewrites() {
		return [{ source: "/api/v1/:path*", destination: `${API_ORIGIN}/v1/:path*` }];
	},
};

export default nextConfig;
