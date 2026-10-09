/// <reference types="vite/client" />

interface ImportMetaEnv {
	/**
	 * Your consent backend URL, from `.env`. When it's unset and
	 * `vite.config.ts` passes `backendURL` to the `consentManifest` plugin,
	 * the plugin sets it to that URL.
	 */
	readonly VITE_C15T_BACKEND_URL: string;
}
