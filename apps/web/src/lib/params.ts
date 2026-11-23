/** Route files read `searchParams` and pass plain strings down (no `useSearchParams` in features). */
export type SearchParams = Record<string, string | string[] | undefined>;

/** The first value of a query parameter, trimmed; undefined when absent or empty. */
export function one(params: SearchParams, key: string): string | undefined {
	const value = params[key];
	const first = Array.isArray(value) ? value[0] : value;
	return first?.trim() || undefined;
}
