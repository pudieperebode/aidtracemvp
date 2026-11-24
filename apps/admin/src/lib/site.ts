/** Brand constants for the console's metadata. The console is never indexed. */
export const SITE_NAME = "AidTrace Admin";

/** Read through next.config `env`, so client components agree with the server render. */
const IS_PRODUCTION = process.env.NEXT_PUBLIC_VERCEL_ENV === "production";

/** This app's base path: `/admin` on every Vercel deployment, empty in dev (next.config.ts). */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Prefix app-local assets when this app is mounted below the site root. */
export function withBasePath(src: string) {
	return BASE_PATH && src.startsWith("/") && !src.startsWith(`${BASE_PATH}/`) ? `${BASE_PATH}${src}` : src;
}

/** The landing site and the organization app on the same host. Link to them with plain <a>s. */
const DEV = !IS_PRODUCTION && process.env.NODE_ENV === "development";
export const LANDING_URL = process.env.NEXT_PUBLIC_LANDING_URL ?? (DEV ? "http://localhost:3002" : "/");
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? (DEV ? "http://localhost:3000" : "/app");
