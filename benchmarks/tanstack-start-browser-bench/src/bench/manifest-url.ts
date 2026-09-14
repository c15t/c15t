/**
 * Server-only. The runner sets `C15T_BENCH_COLD_MANIFEST_TOKEN` in
 * `--cold-manifest` mode so every run starts with a fresh manifest cache
 * key, the same way the Next arm's `app/api/c15t/*` routes do.
 */
export const BENCH_BACKEND_URL = '/api/bench-consent';

export const getBenchManifestURL = function getBenchManifestURL(): string {
	const token = (globalThis as { process?: { env?: Record<string, string> } })
		.process?.env?.C15T_BENCH_COLD_MANIFEST_TOKEN;
	const base =
		process.env.C15T_BENCH_MANIFEST_URL ?? `${BENCH_BACKEND_URL}/manifest`;
	if (!token) {
		return base;
	}
	const url = new URL(base, 'http://c15t-benchmark.local');
	url.searchParams.set('cold', token);
	return base.startsWith('/')
		? `${url.pathname}${url.search}${url.hash}`
		: url.href;
};
