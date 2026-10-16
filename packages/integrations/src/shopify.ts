import type { AllConsentNames, ConsentSnapshot } from '@c15t/core';

/** The consent choices Shopify's Customer Privacy API accepts. */
export interface ShopifyConsentPreferences {
	analytics: boolean;
	marketing: boolean;
	preferences: boolean;
	sale_of_data: boolean;
}

/** Which c15t category grants each Shopify consent. */
export type ShopifyConsentCategories = Record<
	keyof ShopifyConsentPreferences,
	AllConsentNames
>;

/** The part of `window.Shopify.customerPrivacy` the bridge calls. */
export interface ShopifyCustomerPrivacyApi {
	setTrackingConsent: (
		consent: ShopifyConsentPreferences,
		callback?: (result?: unknown) => void
	) => unknown;
}

/** The snapshot fields the bridge reads. A full `ConsentSnapshot` fits. */
export type ShopifyConsentSnapshot = Pick<
	ConsentSnapshot,
	'effectivePermissions' | 'model' | 'policyPending' | 'promptRequirement'
>;

/** A kernel, or anything else with the same snapshot store shape. */
export interface ShopifyConsentSource {
	getSnapshot: () => ShopifyConsentSnapshot;
	subscribe: (
		listener: (snapshot: ShopifyConsentSnapshot) => void
	) => () => void;
}

export interface ShopifyCustomerPrivacyOptions {
	/**
	 * Override which c15t category grants each Shopify consent.
	 * @default { analytics: 'measurement', marketing: 'marketing', preferences: 'functionality', sale_of_data: 'marketing' }
	 */
	categories?: Partial<ShopifyConsentCategories>;
	/** Called after Shopify accepts each choice. */
	onSync?: (preferences: ShopifyConsentPreferences) => void;
	/**
	 * Called when Shopify rejects a choice or `onSync` throws. The bridge
	 * resends a rejected choice after 1, 2 and 4 seconds, then waits for the
	 * next consent update. Logs to the console when unset.
	 */
	onError?: (error: unknown) => void;
}

export interface ShopifyCustomerPrivacyBridge {
	/**
	 * Pass the latest consent snapshot. The bridge sends it to Shopify once the
	 * visitor no longer has a choice to make.
	 */
	update: (snapshot: ShopifyConsentSnapshot) => void;
	/**
	 * Follow a kernel, or the browser client, and send each update.
	 * @returns A function that stops following it.
	 */
	connect: (source: ShopifyConsentSource) => () => void;
	/**
	 * Hydrogen's `consent.setup` for `mode: 'custom-banner'`. Resolves once
	 * Shopify has accepted the visitor's latest choice, so Hydrogen delivers
	 * buffered events only under that choice.
	 */
	setup: () => Promise<void>;
}

/** The categories the bridge uses when you don't override them. */
export const DEFAULT_SHOPIFY_CONSENT_CATEGORIES: Readonly<ShopifyConsentCategories> =
	{
		analytics: 'measurement',
		marketing: 'marketing',
		preferences: 'functionality',
		sale_of_data: 'marketing',
	};

// Hydrogen's framework-agnostic `ShopifyScripts` waits for the first, and
// Shopify's docs and Hydrogen React's `useCustomerPrivacy` for the second.
const apiLoadedEvents = [
	'consentTrackingApiLoaded',
	'shopifyCustomerPrivacyApiLoaded',
] as const;

// Waits before resending a choice Shopify rejected, while nothing newer
// arrives. After the last one, the bridge waits for the next update.
const retryDelays = [1000, 2000, 4000] as const;

const getCustomerPrivacy = (): ShopifyCustomerPrivacyApi | undefined => {
	if (typeof window === 'undefined') {
		return;
	}
	const { Shopify } = window as { Shopify?: { customerPrivacy?: unknown } };
	const api = Shopify?.customerPrivacy;
	return typeof api === 'object' &&
		api !== null &&
		'setTrackingConsent' in api &&
		typeof api.setTrackingConsent === 'function'
		? (api as ShopifyCustomerPrivacyApi)
		: undefined;
};

/**
 * The v0.2 API returns a promise when Hydrogen turns on async consent, and
 * calls back otherwise. Either can report `{ error }`.
 */
const setTrackingConsent = async (
	api: ShopifyCustomerPrivacyApi,
	consent: ShopifyConsentPreferences
): Promise<void> => {
	const result = await new Promise<unknown>((resolve) => {
		const returned = api.setTrackingConsent(consent, resolve);
		if (
			typeof returned === 'object' &&
			returned !== null &&
			'then' in returned &&
			typeof returned.then === 'function'
		) {
			// Resolving with a thenable adopts its result or rejection.
			resolve(returned);
		}
	});
	if (typeof result === 'object' && result !== null && 'error' in result) {
		const { error } = result;
		if (error) {
			throw error instanceof Error ? error : new Error(String(error));
		}
	}
};

/**
 * Map c15t's effective permissions to Shopify's consent choices.
 *
 * @param permissions - Effective permissions from a consent snapshot.
 * @param categories - Category overrides.
 * @returns The four booleans Shopify's Customer Privacy API takes.
 * @example
 * ```ts
 * toShopifyConsent(kernel.getSnapshot().effectivePermissions);
 * ```
 */
export const toShopifyConsent = (
	permissions: ShopifyConsentSnapshot['effectivePermissions'],
	categories: Partial<ShopifyConsentCategories> = {}
): ShopifyConsentPreferences => {
	const mapping = { ...DEFAULT_SHOPIFY_CONSENT_CATEGORIES, ...categories };
	return {
		analytics: permissions[mapping.analytics] === true,
		marketing: permissions[mapping.marketing] === true,
		preferences: permissions[mapping.preferences] === true,
		sale_of_data: permissions[mapping.sale_of_data] === true,
	};
};

/**
 * Whether the snapshot is safe to send. The policy has to be resolved. Under
 * opt-in and IAB, an open choice prompt also has to be answered, including
 * with Reject All. Under opt-out, effective permissions already describe what
 * the visitor allows, so they go out before any click.
 */
const isSettled = (snapshot: ShopifyConsentSnapshot): boolean =>
	!snapshot.policyPending &&
	(snapshot.promptRequirement.kind !== 'choice' ||
		(snapshot.model !== 'opt-in' && snapshot.model !== 'iab'));

/**
 * Send c15t consent to Shopify's Customer Privacy API, for Hydrogen
 * storefronts and Liquid themes. It does not load Shopify's scripts.
 *
 * Nothing is sent while the policy is pending, or while an opt-in visitor
 * has not answered the banner, so Shopify never records a denial the visitor
 * did not make. After that, each change is sent once.
 *
 * @param options - Category overrides and callbacks.
 * @returns A bridge to feed snapshots and pass to Hydrogen's `ShopifyScripts`.
 * @example
 * ```tsx
 * const shopifyPrivacy = createShopifyCustomerPrivacy();
 *
 * function Analytics() {
 *   const snapshot = useSnapshot();
 *   useEffect(() => shopifyPrivacy.update(snapshot), [snapshot]);
 *   return (
 *     <ShopifyScripts
 *       shop={shop}
 *       consent={{ mode: 'custom-banner', setup: shopifyPrivacy.setup }}
 *     />
 *   );
 * }
 * ```
 */
export const createShopifyCustomerPrivacy = (
	options: ShopifyCustomerPrivacyOptions = {}
): ShopifyCustomerPrivacyBridge => {
	let latest: ShopifyConsentPreferences | undefined;
	let sentKey: string | undefined;
	let sending = false;
	let listening = false;
	let failedKey: string | undefined;
	let failures = 0;
	let retryTimer: ReturnType<typeof setTimeout> | undefined;
	let resolveReady: (() => void) | undefined;
	const ready = new Promise<void>((resolve) => {
		resolveReady = resolve;
	});

	const reportError = (error: unknown): void => {
		if (options.onError) {
			options.onError(error);
			return;
		}
		// oxlint-disable-next-line no-console -- Default surface for a failed sync.
		console.error('[c15t] Shopify Customer Privacy sync failed', error);
	};

	const flush = async (): Promise<void> => {
		if (!latest || sending) {
			return;
		}
		const api = getCustomerPrivacy();
		if (!api) {
			if (!listening && typeof document !== 'undefined') {
				listening = true;
				for (const event of apiLoadedEvents) {
					document.addEventListener(event, () => {
						void flush();
					});
				}
			}
			return;
		}
		const consent = latest;
		const key = JSON.stringify(consent);
		if (key === sentKey) {
			return;
		}
		const isNewer = () =>
			latest !== undefined && JSON.stringify(latest) !== key;
		clearTimeout(retryTimer);
		sending = true;
		try {
			await setTrackingConsent(api, consent);
		} catch (error) {
			sending = false;
			reportError(error);
			if (isNewer()) {
				// A newer choice arrived while this one was in flight.
				await flush();
				return;
			}
			if (key !== failedKey) {
				failedKey = key;
				failures = 0;
			}
			const delay = retryDelays[failures];
			failures += 1;
			if (delay !== undefined) {
				retryTimer = setTimeout(() => {
					void flush();
				}, delay);
			}
			return;
		}
		sending = false;
		sentKey = key;
		try {
			options.onSync?.(consent);
		} catch (error) {
			reportError(error);
		}
		if (isNewer()) {
			// Release Hydrogen only once Shopify has the newest choice.
			await flush();
			return;
		}
		resolveReady?.();
	};

	const update = (snapshot: ShopifyConsentSnapshot): void => {
		if (!isSettled(snapshot)) {
			return;
		}
		latest = toShopifyConsent(
			snapshot.effectivePermissions,
			options.categories
		);
		void flush();
	};

	return {
		connect: (source) => {
			update(source.getSnapshot());
			return source.subscribe(update);
		},
		setup: () => {
			void flush();
			return ready;
		},
		update,
	};
};
