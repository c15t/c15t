/**
 * c15t Embed Script
 *
 * Self-executing entry point for CMS platforms (Framer, WordPress, Webflow).
 * Paste a single script tag and get consent management:
 *
 * ```html
 * <script src="https://consent.io/c15t.js" data-backend="https://your-c15t.com"></script>
 * ```
 */

import { getOrCreateConsentRuntime } from 'c15t';
import { parseEmbedConfig } from './config';
import { registerCustomElement } from './custom-element';
import { observeDOM, scanDOM } from './scanner';
import { createUIRenderer } from './ui/renderer';

// ─── Step 0: Capture script element synchronously ───────────────────────────
const config = parseEmbedConfig();

if (config) {
	boot(config);
}

async function boot(config: NonNullable<ReturnType<typeof parseEmbedConfig>>) {
	// ─── Step 1: Register custom element ──────────────────────────────────────
	registerCustomElement();

	// ─── Step 2: Scan DOM for consent-gated scripts ───────────────────────────
	const scannedScripts = scanDOM();

	if (config.debug) {
		console.log(
			`[c15t] Found ${scannedScripts.length} consent-gated scripts in DOM`
		);
	}

	// ─── Step 3: Create the consent runtime ───────────────────────────────────
	// This fires /init immediately (parallel with DOM setup),
	// reads stored consent, and loads consented scripts.
	const { consentStore } = getOrCreateConsentRuntime(
		{
			mode: config.mode,
			backendURL: config.backendURL,
			debug: config.debug,
			store: {
				scripts: scannedScripts,
			},
		},
		{ pkg: '@c15t/embed', version: '0.0.1' }
	);

	// ─── Step 4: Set up the UI renderer ───────────────────────────────────────
	createUIRenderer(consentStore);

	// ─── Step 5: Watch for dynamically added scripts ──────────────────────────
	observeDOM((newScripts) => {
		const state = consentStore.getState();
		const existingIds = new Set(state.scripts.map((s) => s.id));
		const addedScripts = newScripts.filter((s) => !existingIds.has(s.id));

		if (addedScripts.length > 0) {
			if (config.debug) {
				console.log(
					`[c15t] Found ${addedScripts.length} new consent-gated scripts`
				);
			}
			state.setScripts([...state.scripts, ...addedScripts]);
		}
	});
}
