// The acceptance suite points this app at a mock backend. The lines that use
// this helper are hidden from the published docs snippets.
import { env } from '$env/dynamic/public';

/** Overrides the placeholder backend URL when the acceptance suite sets one. */
export const testBackend = <Key extends string>(key: Key) => {
	const testBackendURL = env.PUBLIC_C15T_BACKEND_URL;
	return (testBackendURL ? { [key]: testBackendURL } : {}) as Partial<
		Record<Key, string>
	>;
};
