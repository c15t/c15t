import type { AllConsentNames, HasCondition, Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { readId, skipMissingId } from '../_shared/required-id';
import { resolveScriptUrl, trimToUndefined } from '../_shared/script-url';

declare global {
	interface Window {
		optimizely?: {
			push: (command: Record<string, unknown>) => unknown;
			get?: (module: string) => unknown;
		};
	}
}

/** Optimizely Web Experimentation and Personalization snippet. */
export const optimizelyWebManifest = {
	...vendorManifestContract,
	category: 'experience',
	install: [
		{
			async: false,
			src: '{{scriptSrc}}',
			type: 'loadScript',
		},
	],
	vendor: 'optimizely',
	vendorDetails: {
		homepageUrl: 'https://www.optimizely.com/',
		legalName: 'Optimizely North America Inc.',
		name: 'Optimizely Web Experimentation',
		privacyPolicyUrl: 'https://www.optimizely.com/legal/privacy-notice',
	},
} as const satisfies VendorManifest;

export interface OptimizelyWebOptions {
	/**
	 * Public project number immediately before `.js` in the snippet URL.
	 * Use a string for IDs larger than `Number.MAX_SAFE_INTEGER`.
	 */
	projectId: string | number;
	/**
	 * Consent condition required before the snippet loads.
	 * @default 'experience'
	 */
	category?: HasCondition<AllConsentNames>;
	/**
	 * Custom or proxied Optimizely snippet URL. The project ID remains required.
	 */
	scriptSrc?: string;
	/** CSP nonce for the loader element. */
	nonce?: string;
}

const PROJECT_ID_PATTERN = /^\d+$/u;

/**
 * Creates an Optimizely Web snippet gated on experience consent.
 *
 * The snippet runs experiments when it executes. Loading it after consent can
 * cause page flicker. `async: false` on a dynamic script does not reproduce
 * Optimizely's recommended parser-blocking snippet at the start of `<head>`.
 * Keep the provider's `reloadOnConsentRevoked` enabled to unload an already-running
 * SDK. A standalone core script loader needs application-owned reload handling.
 *
 * @param options - Project, consent condition and loader configuration.
 * @returns The consent-gated Optimizely script configuration.
 * @remarks When `projectId` is missing, blank or not a project number, the
 *   helper logs `optimizelyWeb: missing or invalid projectId` with
 *   `console.error` and returns a script that never loads.
 * @example
 * optimizelyWeb({ projectId: '12345678' });
 * @see https://docs.optimizely.com/web-experimentation/docs/implement-the-one-line-javascript-snippet
 */
export const optimizelyWeb = function optimizelyWeb(
	options: OptimizelyWebOptions
): Script {
	const category = options?.category ?? 'experience';
	const projectId = readId(options?.projectId);
	if (
		projectId === undefined ||
		!PROJECT_ID_PATTERN.test(projectId) ||
		(typeof options.projectId === 'number' &&
			!Number.isSafeInteger(options.projectId))
	) {
		return skipMissingId('optimizelyWeb', 'projectId', {
			category,
			manifest: optimizelyWebManifest,
		});
	}

	return {
		...resolveManifest(optimizelyWebManifest, {
			scriptSrc: resolveScriptUrl(
				options.scriptSrc,
				`https://cdn.optimizely.com/js/${projectId}.js`
			),
		}),
		category,
		nonce: trimToUndefined(options.nonce),
	};
};

/**
 * Requests Optimizely's persistent visitor opt-out through an existing API.
 *
 * Optimizely stores a ten-year `optimizelyOptOut` cookie. Its API cannot opt
 * the visitor back in. This utility is deliberate and is never called by
 * `optimizelyWeb` on ordinary consent revocation. Reload the page to unload
 * code that already ran; the command does not promise to undo page changes.
 * Does nothing during SSR or when no Optimizely API or queue exists.
 *
 * @returns Nothing.
 * @example
 * optOutOptimizely();
 * @see https://docs.optimizely.com/web-experimentation/api/d8Gy-opt-out
 */
export const optOutOptimizely = function optOutOptimizely(): void {
	if (
		typeof window !== 'undefined' &&
		typeof window.optimizely?.push === 'function'
	) {
		window.optimizely.push({ isOptOut: true, type: 'optOut' });
	}
};
