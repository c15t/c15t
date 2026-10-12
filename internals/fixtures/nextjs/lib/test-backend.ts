// The acceptance suite in `internals/fixtures/acceptance` points this app at a mock backend.
const testBackendURL = process.env.NEXT_PUBLIC_C15T_BACKEND_URL;

/** Overrides the placeholder backend URL when the acceptance suite sets one. */
export const testBackend = <Key extends string>(key: Key) =>
	(testBackendURL ? { [key]: testBackendURL } : {}) as Partial<
		Record<Key, string>
	>;
