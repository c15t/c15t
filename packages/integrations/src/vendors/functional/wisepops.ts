import type { AllConsentNames, HasCondition, Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { runtimeTimestampValue, vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { readId, skipMissingId } from '../_shared/required-id';
import { trimToUndefined } from '../_shared/script-url';

declare global {
	interface Window {
		wisepops?: ((...args: unknown[]) => void) & {
			l?: number;
			q?: IArguments[];
		};
	}
}

/** Wisepops loader, snippet queue and consent-gated cookie consent grant. */
export const wisepopsManifest = {
	...vendorManifestContract,
	bootstrap: [
		{
			name: 'wisepops',
			properties: { l: runtimeTimestampValue },
			queue: { property: 'q' },
			queueFormat: 'arguments',
			type: 'defineStubFunction',
		},
	],
	category: '{{category}}',
	install: [
		{
			args: ['options', '{{runtimeOptions}}'],
			global: 'wisepops',
			type: 'callGlobal',
		},
		{
			defer: true,
			src: '{{scriptSrc}}',
			type: 'loadScript',
		},
	],
	onLoadGranted: [
		{
			args: ['consent', 'granted'],
			global: 'wisepops',
			type: 'callGlobal',
		},
	],
	vendor: 'wisepops',
	vendorDetails: {
		homepageUrl: 'https://wisepops.com/',
		legalName: 'Wisepops SAS',
		name: 'Wisepops',
		privacyPolicyUrl: 'https://wisepops.com/privacy-policy',
	},
} as const satisfies VendorManifest;

/** Documented Wisepops options applied before its loader executes. */
export interface WisepopsRuntimeOptions {
	/** Automatic pageview tracking. @default 'url' */
	autoPageview?: 'url' | 'init' | false;
	/** Use localStorage instead of cookies. @default false */
	browserStorage?: boolean;
	/** Maximum size of each Wisepops cookie, in bytes. */
	cookieMaxSize?: number;
}

/** Wisepops site identity, consent condition and loader configuration. */
export interface WisepopsOptions {
	/** Public site identifier from the setup snippet's `h` URL parameter. */
	siteId: string;
	/** Consent condition required before any Wisepops setup. @default 'marketing' */
	category?: HasCondition<AllConsentNames>;
	/** Documented runtime options. The helper always sets `defaultConsent: 'denied'`. */
	options?: WisepopsRuntimeOptions;
	/** CSP nonce for the c15t-managed loader element. */
	nonce?: string;
}

/**
 * Creates a Wisepops script gated on marketing consent by default.
 *
 * The helper creates the snippet queue only after the mapped consent permits
 * the vendor. It configures denied cookie consent before loading the SDK and
 * grants cookie consent after a permitted load completes.
 *
 * Keep `reloadOnConsentRevoked` enabled. Wisepops cannot revoke cookie consent
 * programmatically, and removing the loader cannot stop an SDK that has run.
 *
 * @param options - Wisepops site, consent condition and runtime configuration.
 * @returns The Wisepops script configuration.
 * @remarks When `siteId` is missing or blank, the helper logs
 *   `wisepops: missing or invalid siteId` with `console.error` and returns a
 *   script that never loads. Copy the public ID from Settings > Install Wisepops.
 * @example
 * wisepops({ siteId: 'YOUR_WISEPOPS_SITE_ID' });
 * @see https://support.wisepops.com/en/articles/9975472-how-to-add-wisepops-to-a-custom-website
 * @see https://support.wisepops.com/en/articles/12679556-cookie-consent-mode
 */
export const wisepops = function wisepops(options: WisepopsOptions): Script {
	const category = options?.category ?? 'marketing';
	const siteId = readId(options?.siteId);
	if (siteId === undefined) {
		return skipMissingId('wisepops', 'siteId', {
			category,
			manifest: wisepopsManifest,
		});
	}

	const script = resolveManifest(wisepopsManifest, {
		category,
		runtimeOptions: {
			...options.options,
			defaultConsent: 'denied',
		},
		scriptSrc: `https://wisepops.net/loader.js?v=3&h=${encodeURIComponent(siteId)}`,
	});

	return {
		...script,
		nonce: trimToUndefined(options.nonce),
		onLoad(info) {
			// Core can detach the loader while it is still downloading.
			if (!info.hasConsent || !info.element?.isConnected) {
				return;
			}
			script.onLoad?.(info);
		},
	};
};
