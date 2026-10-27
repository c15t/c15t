import type { Script, ScriptCallbackInfo } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { readId, skipMissingId } from '../_shared/required-id';
import { createScriptReuse } from '../_shared/reuse-script';
import { resolveScriptUrl, trimToUndefined } from '../_shared/script-url';

/** A queued Amazon command and the time the caller issued it. */
export type AmazonAdsQueueEntry = [args: IArguments, timestamp: number];

/** Amazon's callable tag API, including its pre-load command queue. */
export interface AmazonAdsFunction {
	(...args: unknown[]): void;
	q?: AmazonAdsQueueEntry[];
	version?: string;
}

/** Documented input to Amazon's optional consent helper. */
export interface AmazonAdsConsent {
	countryCode: string;
	enableAdStorage: boolean;
	enableUserData: boolean;
	ipAddress?: string;
	gpp?: string;
}

declare global {
	interface Window {
		amzn?: AmazonAdsFunction;
		amznConsent?: (consent: AmazonAdsConsent) => void;
	}
}

/** Options for the Amazon Ads tag. */
export interface AmazonAdsTagOptions {
	/** Tag ID from the Amazon Ads console. */
	tagId: string;
	/** Region of the Amazon advertising account. @default 'NA' */
	region?: 'NA' | 'EU';
	/** Send one PageView after the tag is initialized. @default true */
	trackPageView?: boolean;
	/** Attributes passed to the initial PageView event. */
	pageViewAttributes?: Record<string, unknown>;
	/**
	 * Actual visitor country, as a two-letter ISO 3166-1 code.
	 * Enables the optional ACS helper. Omit when the country is unknown.
	 */
	countryCode?: string;
	/** Visitor IP address forwarded to ACS only when countryCode is supplied. */
	ipAddress?: string;
	/** Existing IAB GPP string forwarded to ACS. c15t does not create it. */
	gpp?: string;
	/** Override the main amzn.js URL. */
	scriptUrl?: string;
	/** Override the optional amzn-consent.js URL. */
	consentScriptUrl?: string;
}

/**
 * Amazon Ads metadata and main loader. Amazon's nested timestamp queue and
 * optional consent helper are implemented in the consent-gated callbacks.
 *
 * @see https://github.com/amzn/ads-pao-amznjs-gtm-template
 * @see https://advertising.amazon.com/legal/product-terms
 */
export const amazonAdsTagManifest = {
	...vendorManifestContract,
	category: 'marketing',
	install: [{ async: true, src: '{{scriptUrl}}', type: 'loadScript' }],
	persistAfterConsentRevoked: true,
	vendor: 'amazon-ads',
	vendorDetails: {
		homepageUrl: 'https://advertising.amazon.com/',
		legalName: 'Amazon Advertising LLC',
		name: 'Amazon Ads',
		privacyPolicyUrl:
			'https://www.amazon.com/gp/help/customer/display.html?nodeId=GX7NJQ4ZB8MHFRNJ',
	},
} satisfies VendorManifest;

// Different configurations can borrow the same c15t-created ACS element.
const helperOwners = new WeakMap<HTMLScriptElement, number>();

interface ConsentOwner {
	readonly allowed: boolean;
	readonly details: Pick<AmazonAdsConsent, 'countryCode' | 'ipAddress' | 'gpp'>;
}

interface SharedConsent {
	owners: Set<ConsentOwner>;
	lastConsent?: AmazonAdsConsent;
	api?: Window['amznConsent'];
}

// ACS is global even when distinct configurations borrow different elements.
const consentOwners = new WeakMap<Document, SharedConsent>();

const createAmazonAdsTag = (options: AmazonAdsTagOptions): Script => {
	const countryCode = trimToUndefined(options.countryCode)?.toUpperCase();
	const script = resolveManifest(amazonAdsTagManifest, {
		scriptUrl: resolveScriptUrl(
			options.scriptUrl,
			'https://c.amazon-adsystem.com/aat/amzn.js'
		),
	});
	let allowed = false;
	let initialized = false;
	let disposed = false;
	let sharedConsent: SharedConsent | undefined;
	const consentOwner: ConsentOwner = {
		get allowed() {
			return allowed;
		},
		details: { countryCode: countryCode ?? '' },
	};
	if (options.ipAddress !== undefined) {
		consentOwner.details.ipAddress = options.ipAddress;
	}
	if (options.gpp !== undefined) {
		consentOwner.details.gpp = options.gpp;
	}
	let helper: HTMLScriptElement | undefined;
	let releaseHelper: (() => void) | undefined;
	const pendingCommands = new Set<AmazonAdsQueueEntry>();

	const ensureQueue = () => {
		if (window.amzn) {
			return;
		}
		const pending: AmazonAdsQueueEntry[] = [];
		const queue = function queue() {
			// oxlint-disable-next-line prefer-rest-params -- Match Amazon's arguments-and-timestamp queue.
			pending.push([arguments, Date.now()]);
		};
		queue.q = pending;
		queue.version = '0.0';
		window.amzn = queue;
	};

	const forwardConsent = () => {
		const state = sharedConsent;
		if (!state || typeof window.amznConsent !== 'function') {
			return;
		}
		const source =
			(state.owners.has(consentOwner) && allowed ? consentOwner : undefined) ??
			[...state.owners].find((owner) => owner.allowed) ??
			state.owners.values().next().value ??
			consentOwner;
		const permitted = state.owners.has(source) && source.allowed;
		const consent: AmazonAdsConsent = {
			...source.details,
			enableAdStorage: permitted,
			enableUserData: permitted,
		};
		const previous = state.lastConsent;
		if (
			state.api === window.amznConsent &&
			previous?.countryCode === consent.countryCode &&
			previous.enableAdStorage === permitted &&
			previous.ipAddress === consent.ipAddress &&
			previous.gpp === consent.gpp
		) {
			return;
		}
		window.amznConsent(consent);
		state.lastConsent = consent;
		state.api = window.amznConsent;
	};

	const initialize = () => {
		if (
			!allowed ||
			initialized ||
			(countryCode && typeof window.amznConsent !== 'function')
		) {
			return;
		}
		ensureQueue();
		const queue = window.amzn?.q;
		const previousLength = queue?.length ?? 0;
		window.amzn?.('setRegion', options.region ?? 'NA');
		window.amzn?.('addTag', options.tagId);
		if (options.trackPageView !== false) {
			window.amzn?.('trackEvent', 'PageView', options.pageViewAttributes ?? {});
		}
		for (const entry of queue?.slice(previousLength) ?? []) {
			pendingCommands.add(entry);
		}
		initialized = true;
	};

	const discardPendingCommands = () => {
		const queue = window.amzn?.q;
		if (queue) {
			for (let index = queue.length - 1; index >= 0; index -= 1) {
				const entry = queue[index];
				if (entry && pendingCommands.has(entry)) {
					queue.splice(index, 1);
					initialized = false;
				}
			}
		}
		pendingCommands.clear();
	};

	const startConsentHelper = (info: ScriptCallbackInfo) => {
		if (!countryCode || window.amznConsent || helper) {
			return;
		}
		const helperId = `${info.elementId}-consent`;
		const existing = document.getElementById(helperId);
		const existingHelper =
			existing instanceof HTMLScriptElement ? existing : undefined;
		helper = existingHelper ?? document.createElement('script');
		if (!existingHelper) {
			helper.id = helperId;
			// Ordered dynamic scripts execute the helper before the core-owned tag.
			helper.async = false;
			helper.src = resolveScriptUrl(
				options.consentScriptUrl,
				'https://c.amazon-adsystem.com/aat/amzn-consent.js'
			);
			if (info.element?.nonce) {
				helper.nonce = info.element.nonce;
			}
		}
		const element = helper;
		if (!existingHelper || helperOwners.has(element)) {
			helperOwners.set(element, (helperOwners.get(element) ?? 0) + 1);
		}
		const completed = (event: Event) => {
			element.removeEventListener('load', completed);
			element.removeEventListener('error', completed);
			if (disposed) {
				return;
			}
			if (event.type === 'error') {
				console.error(
					'amazonAdsTag: consent helper failed to load. Reload to retry.'
				);
				return;
			}
			forwardConsent();
			initialize();
		};
		releaseHelper = () => {
			element.removeEventListener('load', completed);
			element.removeEventListener('error', completed);
			const owners = helperOwners.get(element);
			if (owners === 1) {
				helperOwners.delete(element);
				element.remove();
			} else if (owners !== undefined) {
				helperOwners.set(element, owners - 1);
			}
			helper = undefined;
		};
		helper.addEventListener('load', completed, { once: true });
		helper.addEventListener('error', completed, { once: true });
		if (!existingHelper) {
			document.head.appendChild(helper);
		}
	};

	const update = (info: ScriptCallbackInfo) => {
		if (info.replacing) {
			return;
		}
		const changed = allowed !== info.hasConsent;
		allowed = info.hasConsent;
		if (countryCode && !sharedConsent) {
			sharedConsent = consentOwners.get(document) ?? { owners: new Set() };
			consentOwners.set(document, sharedConsent);
			sharedConsent.owners.add(consentOwner);
		}
		if (!allowed) {
			discardPendingCommands();
			if (window.amzn) {
				forwardConsent();
			}
			return;
		}
		if (!changed) {
			return;
		}
		ensureQueue();
		startConsentHelper(info);
		forwardConsent();
		initialize();
	};

	return {
		...script,
		async: !countryCode,
		observeConsentBeforeLoad: true,
		onBeforeLoad: update,
		onConsentChange: update,
		onDispose: (info) => {
			disposed = true;
			// Hold this permission until incoming membership is known. A
			// replacement can include a real withdrawal, so read current consent.
			allowed =
				info.afterReplacement !== undefined &&
				(info.getCurrentConsent?.().hasConsent ?? info.hasConsent);
			discardPendingCommands();
			releaseHelper?.();
			const finish = () => {
				allowed = false;
				sharedConsent?.owners.delete(consentOwner);
				try {
					forwardConsent();
				} finally {
					if (
						sharedConsent?.owners.size === 0 &&
						consentOwners.get(document) === sharedConsent
					) {
						consentOwners.delete(document);
					}
				}
			};
			if (info.afterReplacement) {
				info.afterReplacement(finish);
			} else {
				finish();
			}
		},
		// The custom bootstrap must run in the client consent lifecycle.
		serverStart: undefined,
	};
};

const reuseAmazonAdsTag = createScriptReuse<AmazonAdsTagOptions>();

/**
 * Loads Amazon Ads after marketing consent, with optional Amazon Consent Signal.
 *
 * @param options - Amazon tag ID, account region, initial event and ACS options.
 * @returns A marketing-gated script retaining its loaders after revocation.
 * @remarks Blank tag IDs log an error and return a script that never loads.
 * ACS requires the visitor's actual country. Both ACS permissions follow the
 * script's consent gate. Denial forwards withdrawal, but Amazon supplies no
 * documented shutdown command. Reload after revocation to stop the runtime.
 * Distinct active ACS configurations preserve permission while any is granted.
 * Removing the last permitted ACS configuration forwards denial.
 * @example
 * ```ts
 * amazonAdsTag({ tagId: 'YOUR_TAG_ID', region: 'EU', countryCode: 'DE' });
 * ```
 */
export const amazonAdsTag = (options: AmazonAdsTagOptions): Script => {
	const tagId = readId(options?.tagId);
	if (tagId === undefined) {
		return skipMissingId('amazonAdsTag', 'tagId', {
			category: 'marketing',
			manifest: amazonAdsTagManifest,
		});
	}
	return reuseAmazonAdsTag({ ...options, tagId }, createAmazonAdsTag);
};
