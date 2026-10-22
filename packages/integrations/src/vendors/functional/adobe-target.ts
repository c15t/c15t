import type { AllConsentNames, HasCondition, Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { readId, skipMissingId } from '../_shared/required-id';
import {
	createScriptReuse,
	getScriptRegistrations,
} from '../_shared/reuse-script';
import { trimToUndefined } from '../_shared/script-url';

/** Supported at.js settings. The helper always enables Adobe's opt-in support. */
export interface AdobeTargetGlobalSettings {
	/** Adobe Opt-in service support. Always set to true by this helper. */
	optinEnabled?: true;
	/** Domain on which at.js writes its first-party cookies. */
	cookieDomain?: string;
	/** Use HTTPS and Secure cookies. */
	secureOnly?: boolean;
	/** Hide page content while Target retrieves offers. */
	bodyHidingEnabled?: boolean;
	/**
	 * CSS that at.js applies while it hides the page for offers.
	 * Adobe's default is `body { opacity: 0 }`.
	 */
	bodyHiddenStyle?: string;
	/** Retrieve page-load offers automatically. */
	pageLoadEnabled?: boolean;
	/** Retrieve SPA views automatically. */
	viewsEnabled?: boolean;
	/** Target delivery timeout in milliseconds. */
	timeout?: number;
	/** Adobe Visitor API timeout in milliseconds. */
	visitorApiTimeout?: number;
	/** CSP nonce for scripts that at.js creates. */
	cspScriptNonce?: string;
	/** CSP nonce for styles that at.js creates. */
	cspStyleNonce?: string;
}

interface AdobeTargetSharedOptions {
	/** Consent condition that permits the loader. @default 'experience' */
	category?: HasCondition<AllConsentNames>;
	/** CSP nonce for the loader element. */
	nonce?: string;
}

/** Load a customer-hosted at.js download from Adobe Target. */
export interface AdobeTargetAtJsOptions extends AdobeTargetSharedOptions {
	mode: 'atjs';
	/** Your self-hosted at.js URL. Adobe provides no shared at.js CDN. */
	scriptUrl: string;
	/** Applied before at.js executes, with optinEnabled forced to true. */
	targetGlobalSettings?: AdobeTargetGlobalSettings;
}

/** Load Adobe Experience Platform Web SDK for a Target-enabled datastream. */
export interface AdobeTargetWebSdkOptions extends AdobeTargetSharedOptions {
	mode: 'websdk';
	/** Public datastream ID from Adobe Data Collection. */
	datastreamId: string;
	/** Adobe organization ID including the @AdobeOrg suffix. */
	orgId: string;
	/** Exact stable Web SDK version, at least 2.21.0, for example '2.30.0'. */
	version: string;
}

/** Choose either the at.js loader or the Web SDK loader. */
export type AdobeTargetOptions =
	| AdobeTargetAtJsOptions
	| AdobeTargetWebSdkOptions;

type AlloyQueueEntry = [
	resolve: (value: unknown) => void,
	reject: (reason?: unknown) => void,
	args: [command: string, options?: Record<string, unknown>],
];

type AlloyFunction = ((
	command: string,
	options?: Record<string, unknown>
) => Promise<unknown>) & { q: AlloyQueueEntry[] };

interface AdobeOptIn {
	Categories?: { TARGET?: string };
	approve: (category: string) => void;
	deny: (category: string) => void;
}

type AdobeTargetWindow = Window & {
	__alloyNS?: string[];
	alloy?: AlloyFunction;
	adobe?: {
		OptInCategories?: { TARGET?: string };
		optIn?: AdobeOptIn;
	};
};

/** Customer-hosted at.js, gated on the configured consent condition. */
export const adobeTargetManifest = {
	...vendorManifestContract,
	category: '{{category}}',
	install: [
		{
			ifUndefined: false,
			name: 'targetGlobalSettings',
			type: 'setGlobal',
			value: '{{targetGlobalSettings}}',
		},
		{ async: true, src: '{{scriptUrl}}', type: 'loadScript' },
	],
	persistAfterConsentRevoked: true,
	vendor: 'adobe-target',
	vendorDetails: {
		homepageUrl: 'https://business.adobe.com/products/target/adobe-target.html',
		legalName: 'Adobe Inc.',
		name: 'Adobe Target',
		privacyPolicyUrl: 'https://www.adobe.com/privacy/policy.html',
	},
} as const satisfies VendorManifest;

/** Web SDK stays installed after its first grant so setConsent can stop it. */
export const adobeTargetWebSdkManifest = {
	...adobeTargetManifest,
	install: [{ async: true, src: '{{scriptUrl}}', type: 'loadScript' }],
} as const satisfies VendorManifest;

const signalAtJsConsent = function signalAtJsConsent(granted: boolean): void {
	const { adobe } = window as AdobeTargetWindow;
	const optIn = adobe?.optIn;
	const category = adobe?.OptInCategories?.TARGET ?? optIn?.Categories?.TARGET;
	if (optIn && category) {
		if (granted) {
			optIn.approve(category);
		} else {
			optIn.deny(category);
		}
	}
};

const createAtJsScript = function createAtJsScript(
	options: AdobeTargetAtJsOptions
): Script {
	const script = resolveManifest(adobeTargetManifest, {
		category: options.category ?? 'experience',
		scriptUrl: options.scriptUrl,
		targetGlobalSettings: {
			...options.targetGlobalSettings,
			optinEnabled: true,
		},
	});
	let granted = false;
	return {
		...script,
		nonce: trimToUndefined(options.nonce),
		observeConsentBeforeLoad: true,
		onBeforeLoad(info) {
			if (!getScriptRegistrations(info).some((state) => state.hasConsent)) {
				return;
			}
			script.onBeforeLoad?.(info);
			granted = info.hasConsent;
			signalAtJsConsent(granted);
		},
		onConsentChange(info) {
			if (granted !== info.hasConsent) {
				granted = info.hasConsent;
				signalAtJsConsent(granted);
			}
		},
		onDispose() {
			if (granted) {
				granted = false;
				signalAtJsConsent(false);
			}
		},
		serverStart: undefined,
	};
};

const installAlloyStub = function installAlloyStub(): AlloyFunction {
	const win = window as AdobeTargetWindow;
	if (win.alloy) {
		return win.alloy;
	}
	win.__alloyNS ??= [];
	if (!win.__alloyNS.includes('alloy')) {
		win.__alloyNS.push('alloy');
	}
	// Adobe replaces q.push with its executor, while the public function stays.
	// The queue entries must keep resolve, reject and command arguments.
	const alloy: AlloyFunction = Object.assign(
		(...args: [command: string, options?: Record<string, unknown>]) =>
			new Promise<unknown>((resolve, reject) => {
				window.setTimeout(() => {
					alloy.q.push([resolve, reject, args]);
				}, 0);
			}),
		{ q: [] as AlloyQueueEntry[] }
	);
	win.alloy = alloy;
	return alloy;
};

const reportAlloyError = (command: string, error: unknown): void => {
	console.error(`adobeTarget: Web SDK ${command} failed`, error);
};

const createWebSdkScript = function createWebSdkScript(
	options: AdobeTargetWebSdkOptions
): Script {
	const script = resolveManifest(adobeTargetWebSdkManifest, {
		category: options.category ?? 'experience',
		scriptUrl: `https://cdn1.adoberesources.net/alloy/${encodeURIComponent(options.version)}/alloy.min.js`,
	});
	let loaded = false;
	let alloy: AlloyFunction | undefined;
	let configureAttempted = false;
	let configured = false;
	let currentConsent = false;
	let acknowledgedConsent: boolean | undefined;
	let sendingConsent = false;
	const sendConsent = async (): Promise<void> => {
		if (
			!configured ||
			!alloy ||
			sendingConsent ||
			acknowledgedConsent === currentConsent
		) {
			return;
		}
		const requestedConsent = currentConsent;
		sendingConsent = true;
		try {
			await alloy('setConsent', {
				consent: [
					{
						standard: 'Adobe',
						value: { general: requestedConsent ? 'in' : 'out' },
						version: '1.0',
					},
				],
			});
			acknowledgedConsent = requestedConsent;
		} catch (error) {
			// A rejected request can still change Adobe's persisted consent.
			acknowledgedConsent = undefined;
			reportAlloyError('setConsent', error);
		}
		sendingConsent = false;
		if (requestedConsent !== currentConsent) {
			void sendConsent();
		}
	};
	const configure = async (runtime: AlloyFunction): Promise<void> => {
		// Alloy retains a rejected configure promise; recovery needs a reload.
		configureAttempted = true;
		try {
			await runtime('configure', {
				datastreamId: options.datastreamId,
				defaultConsent: 'pending',
				orgId: options.orgId,
			});
		} catch (error) {
			reportAlloyError('configure', error);
			return;
		}
		configured = true;
		void sendConsent();
	};
	const signal = (granted: boolean): void => {
		currentConsent = granted;
		if (!loaded || !alloy) {
			return;
		}
		if (configured) {
			void sendConsent();
		} else if (!configureAttempted && granted) {
			void configure(alloy);
		}
	};
	return {
		...script,
		nonce: trimToUndefined(options.nonce),
		observeConsentBeforeLoad: true,
		onBeforeLoad(info) {
			if (getScriptRegistrations(info).some((state) => state.hasConsent)) {
				alloy = installAlloyStub();
			}
		},
		onConsentChange(info) {
			signal(info.hasConsent);
		},
		onDispose() {
			signal(false);
		},
		onLoad(info) {
			if (!info.element?.isConnected) {
				return;
			}
			loaded = true;
			signal(info.hasConsent);
		},
		serverStart: undefined,
	};
};

const reuseAtJsScript = createScriptReuse<AdobeTargetAtJsOptions>();
const reuseWebSdkScript = createScriptReuse<AdobeTargetWebSdkOptions>();

const isSupportedWebSdkVersion = (version: string): boolean => {
	if (!/^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/u.test(version)) {
		return false;
	}
	const [major = 0, minor = 0] = version.split('.').map(Number);
	return major > 2 || (major === 2 && minor >= 21);
};

/**
 * Loads Adobe Target only after the configured consent condition permits it.
 *
 * at.js uses Adobe's Opt-in service when that service is present. Web SDK
 * uses a dedicated installation of window.alloy and Adobe 1.0 setConsent.
 * Keep reloadOnConsentRevoked enabled to stop existing offers and handlers.
 *
 * @param options - Deployment path, public configuration and consent category.
 * @returns A consent-gated script, or an inactive script for invalid options.
 * @remarks Web SDK requires an exact stable version of 2.21.0 or later.
 * Blank required values and unsupported versions log an error and skip loading.
 * Remove existing at.js, Web SDK and Adobe Tags installations of the same SDK.
 * @example
 * adobeTarget({ mode: 'atjs', scriptUrl: '/scripts/at.js' });
 * @example
 * adobeTarget({
 *   mode: 'websdk', datastreamId: 'YOUR_DATASTREAM_ID',
 *   orgId: 'YOUR_ORG_ID@AdobeOrg', version: '2.30.0',
 * });
 */
export const adobeTarget = function adobeTarget(
	options: AdobeTargetOptions
): Script {
	const category = options?.category ?? 'experience';
	if (options?.mode === 'websdk') {
		const datastreamId = readId(options.datastreamId);
		const orgId = readId(options.orgId);
		const version = readId(options.version);
		if (datastreamId === undefined) {
			return skipMissingId('adobeTarget', 'datastreamId', {
				category,
				manifest: adobeTargetWebSdkManifest,
			});
		}
		if (orgId === undefined) {
			return skipMissingId('adobeTarget', 'orgId', {
				category,
				manifest: adobeTargetWebSdkManifest,
			});
		}
		if (version === undefined || !isSupportedWebSdkVersion(version)) {
			return skipMissingId('adobeTarget', 'version', {
				category,
				manifest: adobeTargetWebSdkManifest,
			});
		}
		return reuseWebSdkScript(
			{ ...options, datastreamId, orgId, version },
			createWebSdkScript
		);
	}
	const scriptUrl = readId(options?.scriptUrl);
	if (scriptUrl === undefined) {
		return skipMissingId('adobeTarget', 'scriptUrl', {
			category,
			manifest: adobeTargetManifest,
		});
	}
	return reuseAtJsScript(
		{ ...options, mode: 'atjs', scriptUrl },
		createAtJsScript
	);
};
