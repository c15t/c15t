// The acceptance suite points this app at a mock backend. The lines that use
// this helper are hidden from the published docs snippets. Astro evaluates the
// config as plain JavaScript, so this reads the variable directly.
const testBackendURL = process.env.C15T_BACKEND_URL;

/**
 * Overrides the placeholder backend URL when the acceptance suite sets one.
 *
 * @param {string} key - The option that holds the backend URL.
 * @returns {Record<string, string>} The override, or an empty object.
 */
export const testBackend = (key) =>
	testBackendURL ? { [key]: testBackendURL } : {};
