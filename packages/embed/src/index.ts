/**
 * c15t Embed Script
 *
 * Self-executing entry point for CMS platforms (Framer, WordPress, Webflow).
 *
 * Prestyled mode (default):
 * ```html
 * <script src="c15t.js" data-backend="https://your-c15t.com"></script>
 * ```
 *
 * Headless mode (for custom UI builders):
 * ```html
 * <script src="c15t.js" data-backend="https://your-c15t.com" data-headless="true"></script>
 * <script>
 *   // The raw Zustand store is on window.c15tStore (set by core):
 *   window.c15tStore.getState().saveConsents('all');
 *
 *   // Convenience event API (added by embed):
 *   window.c15tStore.c15t.on('consent', (consents) => { ... });
 * </script>
 * ```
 */

import { getOrCreateConsentRuntime } from 'c15t';
import { parseEmbedConfig } from './config';
import { registerCustomElement } from './custom-element';
import { attachEmbedAPI } from './headless';
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
	// The core store automatically mounts on window.c15tStore.
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

	// ─── Step 4: Attach embed convenience API ─────────────────────────────────
	// Adds event helpers on window.c15tStore.c15t (does NOT overwrite the store)
	attachEmbedAPI(consentStore);

	if (config.debug) {
		console.log(
			`[c15t] Store available on window.c15tStore${config.headless ? ' (headless mode)' : ''}`
		);
	}

	// ─── Step 5: Set up UI (skip in headless mode) ────────────────────────────
	if (!config.headless) {
		createUIRenderer(consentStore);
	}

	// ─── Step 6: Watch for dynamically added scripts ──────────────────────────
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
