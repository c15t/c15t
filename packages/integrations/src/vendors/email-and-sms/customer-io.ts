import type { Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { readId, skipMissingId } from '../_shared/required-id';
import { createScriptReuse } from '../_shared/reuse-script';
import { resolveScriptUrl, stripTrailingSlashes } from '../_shared/script-url';

/** Customer.io's callable analytics.js queue methods. */
export const CUSTOMER_IO_METHODS = [
	'trackSubmit',
	'trackClick',
	'trackLink',
	'trackForm',
	'pageview',
	'identify',
	'reset',
	'group',
	'track',
	'ready',
	'alias',
	'debug',
	'page',
	'once',
	'off',
	'on',
	'addSourceMiddleware',
	'addIntegrationMiddleware',
	'setAnonymousId',
	'addDestinationMiddleware',
] as const;

declare global {
	interface Window {
		/** Absent before consent; an array queue while the SDK downloads. */
		cioanalytics?: {
			page?: (...args: unknown[]) => unknown;
			reset?: () => unknown;
		};
	}
}

/** Customer.io Data Pipelines bootstrap, installed only after consent. */
export const customerIoManifest = {
	...vendorManifestContract,
	category: 'marketing',
	install: [
		{ name: 'cioanalytics', type: 'setGlobal', value: [] },
		{
			methods: [...CUSTOMER_IO_METHODS],
			preserveExisting: true,
			returnTarget: true,
			target: 'cioanalytics',
			type: 'defineQueueMethods',
		},
		{
			ifGlobalIsQueue: true,
			path: ['cioanalytics', '_writeKey'],
			type: 'setGlobalPath',
			value: '{{writeKey}}',
		},
		{
			ifGlobalIsQueue: true,
			path: ['cioanalytics', '_cdn'],
			type: 'setGlobalPath',
			value: '{{cdnUrl}}',
		},
		{
			ifGlobalIsQueue: true,
			path: ['cioanalytics', '_loadOptions'],
			type: 'setGlobalPath',
			value: '{{loadOptions}}',
		},
		{
			ifGlobalIsQueue: true,
			path: ['cioanalytics', 'SNIPPET_VERSION'],
			type: 'setGlobalPath',
			value: '4.15.3',
		},
		{
			async: true,
			attributes: { 'data-global-customerio-analytics-key': 'cioanalytics' },
			src: '{{scriptUrl}}',
			type: 'loadScript',
		},
	],
	persistAfterConsentRevoked: true,
	vendor: 'customer-io',
	vendorDetails: {
		homepageUrl: 'https://customer.io/',
		legalName: 'Peaberry Software Inc.',
		name: 'Customer.io',
		privacyPolicyUrl: 'https://customer.io/legal/privacy-policy/',
	},
} as const satisfies VendorManifest;

export interface CustomerIoOptions {
	/** Public Data Pipelines source write key. */
	writeKey: string;
	/** Region of the Customer.io workspace. @default 'us' */
	region?: 'us' | 'eu';
	/** Loader options. initialPageview is forced off; the helper owns page calls. */
	loadOptions?: Record<string, unknown>;
	/** Consent condition required before loading. @default 'marketing' */
	category?: Script['category'];
	/**
	 * HTTP(S) CDN origin for the loader, settings and SDK assets.
	 * Defaults to the region's CDN. Collection routing uses loadOptions.
	 */
	cdnUrl?: string;
	/** Override only the initial loader URL. Use cdnUrl for a CDN proxy. */
	scriptUrl?: string;
}

const createCustomerIo = function createCustomerIo(
	options: CustomerIoOptions
): Script {
	const category = options?.category ?? 'marketing';
	const writeKey = readId(options?.writeKey);
	if (!writeKey) {
		return skipMissingId('customerIo', 'writeKey', {
			category,
			manifest: customerIoManifest,
		});
	}
	const region = options.region ?? 'us';
	if (region !== 'us' && region !== 'eu') {
		throw new Error("customerIo: region must be 'us' or 'eu'");
	}
	const host = region === 'eu' ? 'cdp-eu.customer.io' : 'cdp.customer.io';
	const cdnUrl = stripTrailingSlashes(
		resolveScriptUrl(options.cdnUrl, `https://${host}`)
	);
	let cdn: URL;
	try {
		cdn = new URL(cdnUrl);
	} catch (error) {
		if (!(error instanceof TypeError)) {
			throw error;
		}
		throw new Error('customerIo: cdnUrl must be an HTTP(S) origin', {
			cause: error,
		});
	}
	if (
		!['https:', 'http:'].includes(cdn.protocol) ||
		cdn.username ||
		cdn.password ||
		cdn.pathname !== '/' ||
		cdn.search ||
		cdn.hash
	) {
		throw new Error('customerIo: cdnUrl must be an HTTP(S) origin');
	}
	const script = resolveManifest(customerIoManifest, {
		cdnUrl: cdn.origin,
		loadOptions: { ...options.loadOptions, initialPageview: false },
		scriptUrl: resolveScriptUrl(
			options.scriptUrl,
			`${cdn.origin}/v1/analytics-js/snippet/${encodeURIComponent(writeKey)}/analytics.min.js`
		),
		writeKey,
	});
	let hasConsent = false;
	let loaded = false;
	let generation = 0;
	let requestedGeneration = -1;
	const pageAfterLoad = (element: HTMLScriptElement | undefined): void => {
		if (
			!loaded ||
			!hasConsent ||
			!element?.isConnected ||
			requestedGeneration === generation
		) {
			return;
		}
		requestedGeneration = generation;
		window.cioanalytics?.page?.();
	};
	return {
		...script,
		category,
		onBeforeLoad(info) {
			if (hasConsent !== info.hasConsent) {
				generation += 1;
			}
			({ hasConsent } = info);
			if (hasConsent) {
				script.onBeforeLoad?.(info);
			}
		},
		onConsentChange(info) {
			const changed = hasConsent !== info.hasConsent;
			({ hasConsent } = info);
			if (!changed) {
				return;
			}
			generation += 1;
			if (hasConsent) {
				pageAfterLoad(info.element);
			} else {
				window.cioanalytics?.reset?.();
			}
		},
		onDispose() {
			hasConsent = false;
			generation += 1;
		},
		onLoad(info) {
			loaded = true;
			if (info.hasConsent) {
				pageAfterLoad(info.element);
			}
		},
		serverStart: undefined,
	};
};

const reuseCustomerIo = createScriptReuse<CustomerIoOptions>();

/**
 * Loads Customer.io once after consent and resets identity on revoke.
 * reset is not an opt-out. Keep reloadOnConsentRevoked enabled to stop the
 * running source and any destination SDKs.
 * @param options - Source write key, workspace region, CDN and loader options.
 * @returns A gated script, or an inactive script for a missing key.
 * @throws {Error} If the region or CDN origin is invalid.
 * @example customerIo({ writeKey: 'YOUR_WRITE_KEY', region: 'eu' });
 * @see https://docs.customer.io/integrations/data-in/connections/javascript/in-app/
 */
export const customerIo = function customerIo(
	options: CustomerIoOptions
): Script {
	if (!readId(options?.writeKey)) {
		return skipMissingId('customerIo', 'writeKey', {
			category: options?.category ?? 'marketing',
			manifest: customerIoManifest,
		});
	}
	return reuseCustomerIo(options, createCustomerIo);
};
