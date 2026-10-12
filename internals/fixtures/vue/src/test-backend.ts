// The acceptance suite points this app at a mock backend through
// `VITE_C15T_BACKEND_URL`.
const testBackendURL = import.meta.env.VITE_C15T_BACKEND_URL;

/** Overrides the placeholder backend URL when the acceptance suite sets one. */
export const testBackend = <Key extends string>(key: Key) =>
	(testBackendURL ? { [key]: testBackendURL } : {}) as Partial<
		Record<Key, string>
	>;
