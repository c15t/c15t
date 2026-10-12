// The acceptance suite points this app at a mock backend. The lines that use
// this helper are hidden from the published docs snippets.
import { PUBLIC_C15T_BACKEND_URL } from '$app/env/public';

/** Overrides the placeholder backend URL when the acceptance suite sets one. */
export const testBackend = <Key extends string>(key: Key) =>
	(PUBLIC_C15T_BACKEND_URL
		? { [key]: PUBLIC_C15T_BACKEND_URL }
		: {}) as Partial<Record<Key, string>>;
