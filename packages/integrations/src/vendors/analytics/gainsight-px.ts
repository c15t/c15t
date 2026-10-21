import type { AllConsentNames, HasCondition, Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { readId, skipMissingId } from '../_shared/required-id';
import { createScriptReuse } from '../_shared/reuse-script';
import { resolveScriptUrl } from '../_shared/script-url';

/** JSON values accepted by the Gainsight PX configuration and identify APIs. */
export type GainsightPxValue =
	| string
	| number
	| boolean
	| null
	| GainsightPxValue[]
	| { [key: string]: GainsightPxValue };

/** Optional fifth argument of the official PX installation snippet. */
export interface GainsightPxConfig {
	/** Store identity cookies on the complete hostname. @default false */
	fullDomainCookie?: boolean;
	/** Store cookie data in localStorage instead of cookies. @default false */
	localStorageCookie?: boolean;
	/** Prefer POST requests for tracking. @default false */
	usePOST?: boolean;
	/** Enable PX's engagement HTML sanitization. */
	htmlSanitization?: boolean;
	/** Allowed domains for content referenced by engagements. */
	htmlSanitizationAllowedDomains?: string[];
	/** c15t owns this switch and enables it only after mapped consent. */
	enableTag?: never;
	/** Other JSON-serializable SDK configuration values documented by PX. */
	[key: string]: GainsightPxValue | undefined;
}

/** A PX user or account identify payload, including custom attributes. */
export interface GainsightPxIdentity {
	/** Stable user or account ID. */
	id: string;
	/** Built-in or custom attributes. Dates use epoch milliseconds. */
	[attribute: string]: GainsightPxValue;
}

/** Configuration for consent-gated product analytics and engagements. */
export interface GainsightPxOptions {
	/** Product/channel key from Administration > Products. */
	productKey: string;
	/** Gate for the whole SDK, including engagements. @default 'measurement' */
	category?: HasCondition<AllConsentNames>;
	/** JSON-serializable PX configuration, passed to `aptrinsic.c`. */
	config?: GainsightPxConfig;
	/** Optional identify call after mapped consent. */
	user?: GainsightPxIdentity;
	/** Optional account argument of the user identify call. Requires `user`. */
	account?: GainsightPxIdentity;
	/** Complete loader URL override. Does not proxy PX's other requests. */
	scriptUrl?: string;
}

// Keep the installed key across server startup and PX replacing its stub.
const productKeyGlobal = '__c15tGainsightPxProductKey';

/** PX's official snippet queue, created only after mapped consent. */
export const gainsightPxManifest = {
	...vendorManifestContract,
	category: '{{category}}',
	install: [
		{
			ifUndefined: true,
			name: 'aptrinsic',
			properties: { c: '{{config}}', p: '{{productKey}}' },
			queue: { property: 'q' },
			queueFormat: 'arguments',
			type: 'defineStubFunction',
		},
		{
			name: productKeyGlobal,
			type: 'setGlobal',
			value: '{{productKey}}',
		},
		{ async: true, src: '{{scriptUrl}}', type: 'loadScript' },
	],
	onBeforeLoadGranted: [
		{
			args: ['config', 'enableTag', true],
			global: 'aptrinsic',
			type: 'callGlobal',
		},
	],
	onConsentDenied: [
		{
			args: ['config', 'enableTag', false],
			global: 'aptrinsic',
			type: 'callGlobal',
		},
		{ args: ['reset'], global: 'aptrinsic', type: 'callGlobal' },
	],
	onConsentGranted: [
		{
			args: ['config', 'enableTag', true],
			global: 'aptrinsic',
			type: 'callGlobal',
		},
	],
	persistAfterConsentRevoked: 'loaded',
	vendor: 'gainsight-px',
	vendorDetails: {
		homepageUrl: 'https://www.gainsight.com/product-experience/',
		legalName: 'Gainsight, Inc.',
		name: 'Gainsight PX',
		privacyPolicyUrl: 'https://www.gainsight.com/policy/privacy/',
	},
} as const satisfies VendorManifest;

const reuseGainsightPxScript = createScriptReuse<GainsightPxOptions>();

const hasStartedGainsightPx = (): boolean => {
	if (typeof window === 'undefined' || !('aptrinsic' in window)) {
		return false;
	}
	const { aptrinsic } = window;
	// PX sets this before initialization and checks it to reject a second bundle.
	return (
		typeof aptrinsic === 'function' &&
		'__sdkBundleStarted' in aptrinsic &&
		aptrinsic.__sdkBundleStarted === true
	);
};

const clearPendingGainsightPx = (): void => {
	if (typeof window === 'undefined' || !('aptrinsic' in window)) {
		return;
	}
	const { aptrinsic } = window;
	if (
		typeof aptrinsic === 'function' &&
		'q' in aptrinsic &&
		Array.isArray(aptrinsic.q) &&
		!(
			'__sdkBundleStarted' in aptrinsic && aptrinsic.__sdkBundleStarted === true
		)
	) {
		Reflect.deleteProperty(window, 'aptrinsic');
		Reflect.deleteProperty(window, '__c15tGainsightPxProductKey');
	}
};

// Match clearPendingGainsightPx without serializing instrumented or bundled code.
const clearPendingGainsightPxSource = `(function(){if(typeof window==='undefined')return;var px=window.aptrinsic;if(typeof px==='function'&&Array.isArray(px.q)&&px.__sdkBundleStarted!==true){Reflect.deleteProperty(window,'aptrinsic');Reflect.deleteProperty(window,'__c15tGainsightPxProductKey')}})();`;

const assertProductKey = (productKey: string): void => {
	if (typeof window === 'undefined') {
		return;
	}
	if (!('aptrinsic' in window)) {
		Reflect.deleteProperty(window, productKeyGlobal);
	}
	const previous =
		productKeyGlobal in window ? window[productKeyGlobal] : undefined;
	if (
		hasStartedGainsightPx() &&
		typeof previous === 'string' &&
		previous !== productKey
	) {
		throw new Error(
			'gainsightPx: cannot change productKey after the SDK has started. Reload the page to switch PX products.'
		);
	}
};

const createGainsightPxScript = function createGainsightPxScript(
	options: GainsightPxOptions
): Script {
	const category = options.category ?? 'measurement';
	const { productKey } = options;

	const manifest: VendorManifest = options.user
		? {
				...gainsightPxManifest,
				onBeforeLoadGranted: [
					...gainsightPxManifest.onBeforeLoadGranted,
					{
						args: options.account
							? ['identify', '{{user}}', '{{account}}']
							: ['identify', '{{user}}'],
						global: 'aptrinsic',
						type: 'callGlobal',
					},
				],
				onConsentGranted: [
					...gainsightPxManifest.onConsentGranted,
					{
						args: options.account
							? ['identify', '{{user}}', '{{account}}']
							: ['identify', '{{user}}'],
						global: 'aptrinsic',
						type: 'callGlobal',
					},
				],
			}
		: gainsightPxManifest;

	const script = resolveManifest(manifest, {
		account: options.account,
		category,
		config: { ...options.config, enableTag: true },
		productKey,
		scriptUrl: resolveScriptUrl(
			options.scriptUrl,
			`https://web-sdk.aptrinsic.com/api/aptrinsic.js?a=${encodeURIComponent(productKey)}`
		),
		user: options.user,
	});
	const originalBeforeLoad = script.onBeforeLoad;
	const originalServerStart = script.serverStart;
	const onBeforeLoad: Script['onBeforeLoad'] = (info) => {
		assertProductKey(productKey);
		if (info.hasConsent && !info.startedOnServer) {
			clearPendingGainsightPx();
		}
		originalBeforeLoad?.(info);
	};
	script.onBeforeLoad = onBeforeLoad;
	script.serverStart = (info, started) => {
		if (started.onBeforeLoad !== onBeforeLoad) {
			return;
		}
		const start = originalServerStart?.(info, {
			...started,
			onBeforeLoad: originalBeforeLoad,
		});
		return start
			? {
					...start,
					code: `${info.hasConsent ? clearPendingGainsightPxSource : ''}${start.code}`,
				}
			: undefined;
	};
	const { onConsentChange } = script;
	script.onConsentChange = (info) => {
		if (info.hasConsent) {
			assertProductKey(productKey);
		}
		onConsentChange?.(info);
	};
	return script;
};

/**
 * Creates a Gainsight PX script that waits for mapped consent.
 *
 * On grant, creates the official `aptrinsic` queue with `p` and `c`, enables
 * the tag and optionally queues `identify`. On revocation, disables the tag
 * and requests a reset. PX currently resets internally when disabled and
 * ignores a subsequent reset command while disabled.
 *
 * @param options - PX product, identity and configuration values.
 * @returns The consent-gated PX script.
 * @remarks A missing or blank `productKey` logs an error and returns a script
 * that never loads. Keep `reloadOnConsentRevoked` enabled to end the loaded
 * SDK's listeners and timers, including an in-flight installation. Completed
 * loaders are retained so another grant uses the same SDK without executing
 * its bundle twice. After disposal, PX's execution marker lets later mounts
 * use its existing API without another loader. Disposal does not stop the SDK.
 * Pending loaders are removed on revocation. A retry before SDK startup
 * rebuilds the pending queue from the current options.
 * @throws {Error} If a different product key is supplied after this helper starts PX.
 * Reload the page to switch products.
 * @example
 * gainsightPx({ productKey: 'AP-PRODUCT-KEY-2' });
 * @see https://support.gainsight.com/PX/API_for_Developers/01About/Work_with_Gainsight_PX_Web_SDK
 * @see https://support.gainsight.com/PX/API_for_Developers/02Usage_of_Different_APIs/Use_Config_API
 */
export const gainsightPx = function gainsightPx(
	options: GainsightPxOptions
): Script {
	const productKey = readId(options?.productKey);
	if (productKey === undefined) {
		return skipMissingId('gainsightPx', 'productKey', {
			category: options?.category ?? 'measurement',
			manifest: gainsightPxManifest,
		});
	}
	assertProductKey(productKey);
	const script = reuseGainsightPxScript(
		{ ...options, productKey },
		createGainsightPxScript
	);
	// Reuse resets its callbacks after final disposal, but cannot unload PX.
	// Read at mount time so retained script objects and fresh helpers both work.
	Object.defineProperty(script, 'callbackOnly', {
		configurable: true,
		enumerable: true,
		get: hasStartedGainsightPx,
	});
	script.observeConsentBeforeLoad = true;
	return script;
};
