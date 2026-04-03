/**
 * Configuration parsed from the embed script's data attributes.
 *
 * @example
 * ```html
 * <script src="https://consent.io/c15t.js"
 *   data-backend="https://your-c15t.com"
 *   data-mode="hosted"
 *   data-debug="true">
 * </script>
 * ```
 */
export interface EmbedConfig {
	/** Backend URL for the c15t API (required) */
	backendURL: string;
	/** Runtime mode */
	mode: 'hosted' | 'offline';
	/** Enable debug logging */
	debug: boolean;
	/** Headless mode — skip UI rendering, only expose window.c15t API */
	headless: boolean;
}

/**
 * Captures and parses configuration from the embed script's data attributes.
 *
 * MUST be called synchronously at the top-level — `document.currentScript`
 * is only available during the initial script evaluation.
 */
export function parseEmbedConfig(): EmbedConfig | null {
	const scriptEl = document.currentScript as HTMLScriptElement | null;
	if (!scriptEl) {
		console.error(
			'[c15t] Could not find the embed script element. Ensure the script is loaded via a <script> tag.'
		);
		return null;
	}

	const backendURL = scriptEl.dataset.backend;
	if (!backendURL) {
		console.error(
			'[c15t] Missing required data-backend attribute on the embed script tag.'
		);
		return null;
	}

	return {
		backendURL,
		mode: (scriptEl.dataset.mode as 'hosted' | 'offline') || 'hosted',
		debug: scriptEl.dataset.debug === 'true',
		headless: scriptEl.dataset.headless === 'true',
	};
}
