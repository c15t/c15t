import type { Script, ScriptCallbackInfo } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { readId, skipMissingId } from '../_shared/required-id';
import { resolveScriptUrl, trimToUndefined } from '../_shared/script-url';

/** Default's scheduler display configuration. */
export type DefaultComAutoDisplayScheduler =
	| boolean
	| {
			/** Show Default's loading indicator while opening the scheduler. */
			loader?: boolean;
			/** CSS selector for the scheduler container. */
			target: string;
	  };

/** Options for the current Default Pixel. */
export interface DefaultComPixelOptions {
	/** Scheduler display setting forwarded to Default without modification. */
	autoDisplayScheduler?: DefaultComAutoDisplayScheduler;
	/** Public key from your Default workspace. Whitespace is trimmed. */
	publicKey: string;
	/** Scheduler origins allowed by your Default workspace. */
	schedulerOrigins?: string[];
	/**
	 * Custom or proxied loader for the current Pixel generation.
	 * Blank values use the default URL.
	 * @default 'https://handshake.default.com/index.js'
	 */
	scriptUrl?: string;
}

/** Options for a standalone Default Forms SDK installation. */
export interface DefaultComFormsSdkOptions extends DefaultComPixelOptions {
	/** Default API endpoint override, for example a configured same-origin proxy. */
	endpoint?: string;
	/**
	 * Custom or proxied loader for the current Forms SDK generation.
	 * Blank values use the default URL.
	 * @default 'https://handshake.default.com/sdk.js'
	 */
	scriptUrl?: string;
}

interface DefaultComConsent {
	analytics: boolean;
	marketing: boolean;
}

interface DefaultComPixelBootstrap {
	autoDisplayScheduler?: DefaultComAutoDisplayScheduler;
	key?: string;
	q?: unknown[];
	schedulerOrigins?: string[];
	setConsent?: (consent: DefaultComConsent) => void;
}

interface DefaultComFormsSdkInitOptions {
	autoDisplayScheduler?: DefaultComAutoDisplayScheduler;
	endpoint?: string;
	publicKey: string;
	schedulerOrigins?: string[];
}

interface DefaultComFormsSdkClient {
	init: (options: DefaultComFormsSdkInitOptions) => void;
	setConsent: (consent: DefaultComConsent) => void;
}

declare global {
	interface Window {
		__defaultPixel__?: DefaultComPixelBootstrap;
		DefaultPixelSDK?: DefaultComFormsSdkClient;
	}
}

const vendorDetails = {
	homepageUrl: 'https://www.default.com/',
	legalName: 'Tomo HQ, Inc.',
	name: 'Default',
	privacyPolicyUrl: 'https://www.default.com/legal/privacy',
};

/** Current Default Pixel loader. The helper supplies its runtime bootstrap. */
export const defaultComPixelManifest = {
	...vendorManifestContract,
	category: 'marketing',
	install: [{ async: true, src: '{{scriptUrl}}', type: 'loadScript' }],
	persistAfterConsentRevoked: true,
	vendor: 'default-com',
	vendorDetails,
} satisfies VendorManifest;

/** Standalone Forms SDK loader. Shares the Pixel's preference-center vendor. */
export const defaultComFormsSdkManifest = {
	...vendorManifestContract,
	category: 'marketing',
	install: [{ async: true, src: '{{scriptUrl}}', type: 'loadScript' }],
	persistAfterConsentRevoked: true,
	vendor: 'default-com',
	vendorDetails,
} satisfies VendorManifest;

const initializedSdks = new WeakSet<DefaultComFormsSdkClient>();
type DefaultComLoader = 'defaultComPixel' | 'defaultComFormsSdk';
const pageLoaders = new WeakMap<Document, DefaultComLoader>();
const blockedLoaderType = 'application/x-c15t-default-conflict';

const claimLoader = function claimLoader(
	info: ScriptCallbackInfo,
	helper: DefaultComLoader
): boolean {
	if (
		typeof document === 'undefined' ||
		!info.element ||
		!info.hasConsent ||
		info.vendor?.granted === false
	) {
		return false;
	}
	const existing = pageLoaders.get(document);
	const conflictingGlobal =
		helper === 'defaultComPixel'
			? window.DefaultPixelSDK !== undefined
			: window.__defaultPixel__?.key !== undefined;
	if ((existing !== undefined && existing !== helper) || conflictingGlobal) {
		// Core catches callback errors, so throwing would still insert the loader.
		// Disable the element itself before core appends it.
		info.element.removeAttribute('src');
		info.element.type = blockedLoaderType;
		console.error(
			`${helper}: conflicting Default installation. Use one Default helper per page. The conflicting loader will not run.`
		);
		return false;
	}
	pageLoaders.set(document, helper);
	return true;
};

const ownsLoader = function ownsLoader(
	info: ScriptCallbackInfo,
	helper: DefaultComLoader
): boolean {
	return (
		typeof document !== 'undefined' &&
		pageLoaders.get(document) === helper &&
		info.element?.type !== blockedLoaderType
	);
};

const mapConsent = function mapConsent(
	info: ScriptCallbackInfo
): DefaultComConsent {
	const permitted = info.hasConsent && info.vendor?.granted !== false;
	return {
		analytics: permitted && info.consents.measurement === true,
		marketing: permitted && info.consents.marketing === true,
	};
};

const forwardPixelConsent = function forwardPixelConsent(
	info: ScriptCallbackInfo
): void {
	if (typeof window !== 'undefined' && ownsLoader(info, 'defaultComPixel')) {
		window.__defaultPixel__?.setConsent?.(mapConsent(info));
	}
};

/**
 * Loads the current Default Pixel after marketing consent.
 *
 * @param options - Public workspace key, scheduler configuration and loader URL.
 * @returns A marketing-gated script, or a skipped script for an invalid key.
 * @remarks
 * Use one Default helper per page. The first permitted helper claims the page.
 * A conflicting helper logs an error and disables its loader before insertion.
 * The claim lasts until navigation, including after withdrawal or disposal.
 * A pre-existing Forms SDK global also prevents the Pixel loader from running.
 *
 * The Pixel receives measurement consent as `analytics` and marketing consent
 * as `marketing`. Effective helper or vendor denial sends both values as false.
 * Keep c15t's default revocation reload enabled. Default's consent API does not
 * stop form capture, scheduler activity or an already loaded Vector script.
 * Missing, blank or non-string keys log an error and skip loading.
 * @example defaultComPixel({ publicKey: 'YOUR_PUBLIC_KEY' });
 * @see https://docs.os.default.com/settings/pixel
 * @see https://docs.os.default.com/forms/privacy
 */
export const defaultComPixel = function defaultComPixel(
	options: DefaultComPixelOptions
): Script {
	const publicKey = readId(
		typeof options?.publicKey === 'string' ? options.publicKey : undefined
	);
	if (publicKey === undefined) {
		return skipMissingId('defaultComPixel', 'publicKey', {
			category: 'marketing',
			manifest: defaultComPixelManifest,
		});
	}
	const script = resolveManifest(defaultComPixelManifest, {
		scriptUrl: resolveScriptUrl(
			options.scriptUrl,
			'https://handshake.default.com/index.js'
		),
	});
	return {
		...script,
		onBeforeLoad(info) {
			if (!claimLoader(info, 'defaultComPixel')) {
				return;
			}
			window.__defaultPixel__ ??= {};
			const config = window.__defaultPixel__;
			config.key = publicKey;
			if (options.schedulerOrigins !== undefined) {
				config.schedulerOrigins = options.schedulerOrigins;
			}
			if (options.autoDisplayScheduler !== undefined) {
				config.autoDisplayScheduler = options.autoDisplayScheduler;
			}
			config.q ??= [];
			config.setConsent ??= (consent) => {
				config.q?.push(['setConsent', consent]);
			};
			config.setConsent(mapConsent(info));
		},
		onConsentChange: forwardPixelConsent,
		onLoad(info) {
			if (info.element?.isConnected) {
				forwardPixelConsent(info);
			}
		},
		// The runtime wrapper must apply consent before the loader is inserted.
		serverStart: undefined,
	};
};

/**
 * Loads the current standalone Default Forms SDK after marketing consent.
 *
 * @param options - Public workspace key, SDK endpoint and scheduler options.
 * @returns A marketing-gated SDK script, or a skipped script for an invalid key.
 * @remarks
 * Use one Default helper per page. The first permitted helper claims the page.
 * A conflicting helper logs an error and disables its loader before insertion.
 * The SDK loader is also blocked when `__defaultPixel__.key` already exists,
 * because the SDK would auto-initialize before this helper forwards consent.
 * This helper never clears or sets Pixel configuration. Claims last until
 * navigation, including after withdrawal or disposal.
 *
 * For a standalone installation, the helper calls `setConsent` before `init`
 * and initializes each SDK client once per page. A load that finishes while
 * denied receives both consent values as false and waits for a later grant
 * before initialization. Keep c15t's default revocation reload enabled because
 * Default does not offer a complete form or scheduler shutdown API.
 * Missing, blank or non-string keys log an error and skip loading.
 * @example defaultComFormsSdk({ publicKey: 'YOUR_PUBLIC_KEY' });
 * @see https://docs.os.default.com/pixel-sdk-reference
 * @see https://docs.os.default.com/forms/privacy
 */
export const defaultComFormsSdk = function defaultComFormsSdk(
	options: DefaultComFormsSdkOptions
): Script {
	const publicKey = readId(
		typeof options?.publicKey === 'string' ? options.publicKey : undefined
	);
	if (publicKey === undefined) {
		return {
			...skipMissingId('defaultComFormsSdk', 'publicKey', {
				category: 'marketing',
				manifest: defaultComFormsSdkManifest,
			}),
			id: 'default-com-forms-sdk',
		};
	}
	const script = resolveManifest(defaultComFormsSdkManifest, {
		scriptUrl: resolveScriptUrl(
			options.scriptUrl,
			'https://handshake.default.com/sdk.js'
		),
	});
	const initOptions: DefaultComFormsSdkInitOptions = { publicKey };
	const endpoint = trimToUndefined(options.endpoint);
	if (endpoint !== undefined) {
		initOptions.endpoint = endpoint;
	}
	if (options.schedulerOrigins !== undefined) {
		initOptions.schedulerOrigins = options.schedulerOrigins;
	}
	if (options.autoDisplayScheduler !== undefined) {
		initOptions.autoDisplayScheduler = options.autoDisplayScheduler;
	}
	const synchronize = (info: ScriptCallbackInfo): void => {
		if (
			typeof window === 'undefined' ||
			!ownsLoader(info, 'defaultComFormsSdk') ||
			!info.element?.isConnected
		) {
			return;
		}
		const sdk = window.DefaultPixelSDK;
		if (!sdk) {
			return;
		}
		const consent = mapConsent(info);
		sdk.setConsent(consent);
		if (consent.marketing && !initializedSdks.has(sdk)) {
			sdk.init(initOptions);
			initializedSdks.add(sdk);
		}
	};
	return {
		...script,
		id: 'default-com-forms-sdk',
		onBeforeLoad(info) {
			claimLoader(info, 'defaultComFormsSdk');
		},
		onConsentChange: synchronize,
		onLoad: synchronize,
		serverStart: undefined,
	};
};
