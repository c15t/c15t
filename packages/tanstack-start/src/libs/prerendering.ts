/**
 * Whether this render is TanStack Start's build-time prerender, which writes
 * HTML every visitor is served. The Start plugin sets `TSS_PRERENDERING`
 * for the whole prerender run.
 */
export const isPrerendering = function isPrerendering(): boolean {
	const env = (
		globalThis as { process?: { env?: Record<string, string | undefined> } }
	).process?.env;
	return env?.TSS_PRERENDERING === 'true';
};
