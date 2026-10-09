/// <reference types="vite/client" />

interface ImportMetaEnv {
	/**
	 * Your consent backend URL. When it's unset, the `consentManifest` plugin
	 * sets it to the URL in `vite.config.ts`.
	 */
	readonly VITE_C15T_BACKEND_URL: string;
}
