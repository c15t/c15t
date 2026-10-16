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
	/** The choice Shopify holds for this visitor: `'yes'`, `'no'` or `''`. */
	currentVisitorConsent?: () => Partial<
		Record<keyof ShopifyConsentPreferences, string>
	>;
}

/** The snapshot fields the bridge reads. A full `ConsentSnapshot` fits. */
export type ShopifyConsentSnapshot = Pick<
	ConsentSnapshot,
	| 'effectivePermissions'
	| 'explicitChoice'
	| 'model'
	| 'policyPending'
	| 'promptRequirement'
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
	 * visitor has made a choice and has no new one to make. Under opt-in and
	 * IAB policies, while the visitor owes a choice, it sends c15t's denials
	 * only if Shopify may still hold grants from an earlier one.
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

const toError = (reason: unknown): Error => {
	const error =
		typeof reason === 'object' && reason !== null && 'error' in reason
			? reason.error
			: reason;
	return error instanceof Error ? error : new Error(String(error));
};

/**
 * Shopify calls back with `(null, response)` or `({ error })`, before its
 * returned promise settles. Once it has a callback, that promise fulfills even
 * on failure, so the callback decides the result.
 */
const setTrackingConsent = async (
	api: ShopifyCustomerPrivacyApi,
	consent: ShopifyConsentPreferences
): Promise<void> => {
	let reply: (result?: unknown) => void = () => undefined;
	const replied = new Promise<unknown>((resolve) => {
		reply = resolve;
	});
	try {
		await api.setTrackingConsent(consent, reply);
	} catch (error) {
		throw toError(error);
	}
	const result = await replied;
	if (
		typeof result === 'object' &&
		result !== null &&
		'error' in result &&
		result.error
	) {
		throw toError(result);
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

const consentKeys = [
	'analytics',
	'marketing',
	'preferences',
	'sale_of_data',
] as const;

/** Whether `held` grants anything `consent` denies. */
const grantsDenied = (
	held: Partial<Record<keyof ShopifyConsentPreferences, unknown>> | undefined,
	consent: ShopifyConsentPreferences
): boolean =>
	held !== undefined &&
	consentKeys.some(
		(key) => !consent[key] && (held[key] === true || held[key] === 'yes')
	);

/**
 * What the bridge can do with a snapshot. Shopify records consent only on a
 * visitor interaction, so nothing goes out before the visitor chooses.
 *
 * - `wait`: the policy is pending.
 * - `revoke`: an opt-in or IAB visitor owes a choice. Hydrogen keeps holding
 *   events. If Shopify may still hold grants from an earlier choice, the
 *   bridge sends c15t's denials so Shopify drops them.
 * - `shopify-defaults`: under opt-out, the visitor has not chosen yet.
 *   Hydrogen runs under Shopify's region defaults, which also read GPC.
 * - `send`: the visitor has chosen, including with Reject All.
 */
const nextStep = (
	snapshot: ShopifyConsentSnapshot
): 'wait' | 'revoke' | 'shopify-defaults' | 'send' => {
	if (snapshot.policyPending) {
		return 'wait';
	}
	const owesChoice = snapshot.promptRequirement.kind === 'choice';
	if (snapshot.model === 'opt-in' || snapshot.model === 'iab') {
		return owesChoice ? 'revoke' : 'send';
	}
	return owesChoice || snapshot.explicitChoice === null
		? 'shopify-defaults'
		: 'send';
};

/**
 * Send c15t consent to Shopify's Customer Privacy API, for Hydrogen
 * storefronts and Liquid themes. It does not load Shopify's scripts.
 *
 * Nothing is sent until the visitor makes a choice, so Shopify never records
 * one the visitor did not make. Under opt-in and IAB policies, Hydrogen holds
 * events until then. Under opt-out, Shopify's region defaults apply until
 * then. After that, each change is sent once.
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
	// Set while `latest` only revokes earlier grants. The visitor still owes
	// a choice, so Shopify gets it only if it may hold grants, and Hydrogen
	// keeps holding events.
	let revoking = false;
	let storedChoice = false;
	let sent: ShopifyConsentPreferences | undefined;
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
			try {
				options.onError(error);
				return;
			} catch (callbackError) {
				// Keep retrying and sending newer choices when the callback throws.
				// oxlint-disable-next-line no-console -- Nowhere else to report it.
				console.error('[c15t] Shopify onError threw', callbackError);
			}
		}
		// oxlint-disable-next-line no-console -- Default surface for a failed sync.
		console.error('[c15t] Shopify Customer Privacy sync failed', error);
	};

	// Whether Shopify may hold grants from an earlier choice that `consent`
	// denies.
	const mayHoldGrants = (
		api: ShopifyCustomerPrivacyApi,
		consent: ShopifyConsentPreferences
	): boolean => {
		if (storedChoice || grantsDenied(sent, consent)) {
			return true;
		}
		try {
			return grantsDenied(api.currentVisitorConsent?.(), consent);
		} catch {
			return false;
		}
	};

	// A revocation alone does not release Hydrogen. The visitor still owes a
	// choice.
	const release = (): void => {
		if (!revoking) {
			resolveReady?.();
		}
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
			// Shopify already has the latest choice, for example after the
			// visitor went back to it while a newer request failed. That ends
			// the failed choice's retries.
			clearTimeout(retryTimer);
			failedKey = undefined;
			failures = 0;
			release();
			return;
		}
		if (revoking && !mayHoldGrants(api, consent)) {
			// Shopify holds nothing c15t denies, so there is nothing to revoke.
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
		sent = consent;
		sentKey = key;
		failedKey = undefined;
		failures = 0;
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
		release();
	};

	const update = (snapshot: ShopifyConsentSnapshot): void => {
		const step = nextStep(snapshot);
		if (step === 'wait') {
			return;
		}
		if (step === 'shopify-defaults') {
			if (!latest) {
				resolveReady?.();
			}
			return;
		}
		// IAB consent set through the CMP API leaves `explicitChoice` empty, so
		// `revoke` also asks Shopify what it holds.
		revoking = step === 'revoke';
		storedChoice = snapshot.explicitChoice !== null;
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
