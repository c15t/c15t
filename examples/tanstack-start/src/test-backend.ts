/**
 * The acceptance suite in `examples/shared` points this app at a mock
 * backend through `VITE_C15T_BACKEND_URL`, and `bun run dev` points it at the
 * self-hosted route (see `vite.config.ts`). The lines that use this helper
 * are hidden from the published docs snippets.
 */
const testBackendURL = import.meta.env.VITE_C15T_BACKEND_URL;

/** Overrides the placeholder backend URL when the environment sets one. */
export const testBackend = <Key extends string>(key: Key) =>
	(testBackendURL ? { [key]: testBackendURL } : {}) as Partial<
		Record<Key, string>
	>;
