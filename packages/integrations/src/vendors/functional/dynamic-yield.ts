import type { Script, ScriptCallbackInfo } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { readId, skipMissingId } from '../_shared/required-id';

/** Dynamic Yield page context from its Web implementation guide. */
export interface DynamicYieldRecommendationContext {
	/** The page type used by the section's product or content feed. */
	type: 'HOMEPAGE' | 'CATEGORY' | 'PRODUCT' | 'CART' | 'POST' | 'OTHER';
	/** Category hierarchy, product SKUs, post ID, or other page identifier. */
	data?: string[];
	/** Feed locale, for example `en_GB`. */
	lng?: string;
}

declare global {
	interface Window {
		DY?: {
			recommendationContext?: DynamicYieldRecommendationContext;
			userActiveConsent?: { accepted: boolean };
			[key: string]: unknown;
		};
	}
}

interface DynamicYieldStaticLoader {
	element?: HTMLScriptElement;
	owners: Set<symbol | string>;
}

// Core can share one dynamic loader across independent registrations.
const staticLoaders = new WeakMap<
	HTMLScriptElement,
	DynamicYieldStaticLoader
>();

/** Dynamic Yield setup and Active Cookie Consent signals. */
export const dynamicYieldManifest = {
	...vendorManifestContract,
	category: 'experience',
	install: [
		{ name: 'DY', type: 'setGlobal', value: {} },
		{
			path: ['DY', 'userActiveConsent'],
			type: 'setGlobalPath',
			value: { accepted: true },
		},
		{ async: false, src: '{{scriptSrc}}', type: 'loadScript' },
	],
	onConsentDenied: [
		{
			path: ['DY', 'userActiveConsent'],
			type: 'setGlobalPath',
			value: { accepted: false },
		},
	],
	onConsentGranted: [
		{
			path: ['DY', 'userActiveConsent'],
			type: 'setGlobalPath',
			value: { accepted: true },
		},
	],
	vendor: 'dynamic-yield',
	vendorDetails: {
		homepageUrl: 'https://www.dynamicyield.com/',
		legalName: 'Dynamic Yield Ltd.',
		name: 'Dynamic Yield',
		privacyPolicyUrl: 'https://www.dynamicyield.com/privacy-policy/',
	},
} as const satisfies VendorManifest;

export interface DynamicYieldOptions {
	/** Public section ID from the Dynamic Yield installation snippet. */
	sectionId: string;
	/** Data center for the section. @default 'us' */
	region?: 'us' | 'eu';
	/** Page context installed before either loader runs. Omit to preserve it. */
	recommendationContext?: DynamicYieldRecommendationContext;
	/** Consent category or condition required to load. @default 'experience' */
	category?: Script['category'];
	/** CSP nonce for both loaders. Provider-injected nonces are forwarded too. */
	nonce?: string;
}

/**
 * Creates a Dynamic Yield script gated on experience consent.
 *
 * Loads `api_dynamic.js`, then `api_static.js`. This consent-gated sequence
 * differs from Dynamic Yield's recommended synchronous page-head installation.
 * Keep `reloadOnConsentRevoked` enabled to stop SDK code that already ran.
 * Active Cookie Consent must also be enabled by Dynamic Yield Support for the
 * SDK to honor `DY.userActiveConsent` updates.
 *
 * @param options - Section, data center, page context, and consent gate.
 * @returns The Dynamic Yield script configuration.
 * @remarks A missing or blank `sectionId` logs
 * `dynamicYield: missing or invalid sectionId` and returns a script that never
 * loads. No Dynamic Yield global or preconnect is created before consent.
 * @example
 * dynamicYield({ sectionId: 'YOUR_SECTION_ID', region: 'eu' });
 * @see https://dy.dev/docs/implement-script
 * @see https://dy.dev/docs/active-cookie-consent
 */
export const dynamicYield = function dynamicYield(
	options: DynamicYieldOptions
): Script {
	const category = options?.category ?? 'experience';
	const sectionId = readId(options?.sectionId);
	if (sectionId === undefined) {
		return skipMissingId('dynamicYield', 'sectionId', {
			category,
			manifest: dynamicYieldManifest,
		});
	}

	const hostname =
		options.region === 'eu'
			? 'cdn-eu.dynamicyield.com'
			: 'cdn.dynamicyield.com';
	const base = `https://${hostname}/api/${encodeURIComponent(sectionId)}`;
	const nonce = options.nonce?.trim() || undefined;
	const manifest: VendorManifest = options.recommendationContext
		? {
				...dynamicYieldManifest,
				install: [
					...dynamicYieldManifest.install,
					{
						path: ['DY', 'recommendationContext'],
						type: 'setGlobalPath',
						value: options.recommendationContext,
					},
				],
			}
		: dynamicYieldManifest;
	const resolved = resolveManifest(manifest, {
		scriptSrc: `${base}/api_dynamic.js`,
	});
	const registrations = new Map<symbol | string, DynamicYieldStaticLoader>();
	const keyOf = (info: ScriptCallbackInfo) =>
		info.registration ?? info.elementId;
	const retainStatic = (info: ScriptCallbackInfo) => {
		if (!info.element) {
			return;
		}
		let shared = staticLoaders.get(info.element);
		if (!shared) {
			shared = { owners: new Set() };
			staticLoaders.set(info.element, shared);
		}
		const key = keyOf(info);
		shared.owners.add(key);
		registrations.set(key, shared);
		return shared;
	};
	const removeStatic = (info: ScriptCallbackInfo) => {
		const key = keyOf(info);
		const shared = registrations.get(key);
		registrations.delete(key);
		if (shared?.owners.delete(key) && shared.owners.size === 0) {
			shared.element?.remove();
		}
	};

	return {
		...resolved,
		category,
		nonce,
		onConsentChange(info) {
			if (info.hasConsent) {
				retainStatic(info);
			}
			resolved.onConsentChange?.(info);
			if (!info.hasConsent) {
				removeStatic(info);
			}
		},
		onDispose(info) {
			removeStatic(info);
		},
		onLoad(info) {
			if (!info.hasConsent || !info.element?.isConnected) {
				return;
			}
			const shared = retainStatic(info);
			if (!shared || shared.element?.isConnected) {
				return;
			}
			const element = document.createElement('script');
			element.async = false;
			element.src = `${base}/api_static.js`;
			const loaderNonce = info.element.nonce || nonce;
			if (loaderNonce) {
				element.nonce = loaderNonce;
			}
			shared.element = element;
			document.head.appendChild(element);
		},
	};
};
