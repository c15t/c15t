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
	/** Signals left out keep the value Shopify holds. */
	setTrackingConsent: (
		consent: Partial<ShopifyConsentPreferences>,
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
	/**
	 * Called with what Shopify accepted: all four values for a choice, or only
	 * the dropped grants for a revocation.
	 */
	onSync?: (preferences: Partial<ShopifyConsentPreferences>) => void;
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
	 * visitor has made a choice and has no new one to make. Until then, it
	 * sends something only if Shopify may still hold a grant c15t denies, and
	 * then only drops that grant.
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
	consent: Partial<ShopifyConsentPreferences>
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

/**
 * `false` for each grant in `held` that `consent` denies, or `undefined` when
 * there is none. Shopify keeps the signals left out, including unset ones.
 */
const revocation = (
	held: ShopifyConsentPreferences,
	consent: ShopifyConsentPreferences
): Partial<ShopifyConsentPreferences> | undefined => {
	const denied = consentKeys.filter((key) => held[key] && !consent[key]);
	if (denied.length === 0) {
		return;
	}
	return Object.fromEntries(denied.map((key) => [key, false]));
};

/**
 * What the bridge can do with a snapshot. Shopify records consent only on a
 * visitor interaction, so nothing goes out before the visitor chooses.
 *
 * - `wait`: the policy is pending.
 * - `revoke`: an opt-in or IAB visitor owes a choice. Hydrogen keeps holding
 *   events.
 * - `shopify-defaults`: an opt-out visitor has no current choice. Hydrogen
 *   runs under Shopify's region defaults, which also read GPC.
 * - `send`: the visitor has chosen, including with Reject All.
 *
 * In `revoke` and `shopify-defaults`, the bridge sends something only if
 * Shopify may still hold a grant c15t denies, and then only drops it.
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
	// Set while the visitor has no current choice. Shopify then gets only
	// revocations of grants `latest` denies.
	let revoking = false;
	// Set while an opt-in or IAB visitor owes a choice, so Hydrogen keeps
	// holding events.
	let holding = false;
	let storedChoice = false;
	let sent: Partial<ShopifyConsentPreferences> | undefined;
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

	const reportedConsent = (
		api: ShopifyCustomerPrivacyApi
	): Partial<Record<string, string>> | undefined => {
		try {
			return api.currentVisitorConsent?.();
		} catch {
			// A report that throws counts as no report.
		}
	};

	// What Shopify may grant: what the bridge sent and what Shopify reports.
	// Without a report, a choice c15t stored may have granted anything. IAB
	// consent set through the CMP API leaves `explicitChoice` empty, so the
	// report matters there.
	const heldGrants = (
		visitor: Partial<Record<string, string>> | undefined
	): ShopifyConsentPreferences => {
		const held = (key: keyof ShopifyConsentPreferences): boolean =>
			sent?.[key] === true || (visitor ? visitor[key] === 'yes' : storedChoice);
		return {
			analytics: held('analytics'),
			marketing: held('marketing'),
			preferences: held('preferences'),
			sale_of_data: held('sale_of_data'),
		};
	};

	// Identifies the work `latest` asks for, so a request can tell whether
	// it is still current.
	const latestKey = (): string | undefined =>
		latest && JSON.stringify([latest, revoking]);

	// Nothing is released while the policy is pending or an opt-in or IAB
	// visitor owes a choice.
	const release = (): void => {
		if (latest && !holding) {
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
		const target = latestKey();
		const visitor = revoking ? reportedConsent(api) : undefined;
		const consent = revoking ? revocation(heldGrants(visitor), latest) : latest;
		if (!consent) {
			// Shopify holds nothing c15t denies, so there is nothing to revoke.
			release();
			return;
		}
		const key = JSON.stringify(consent);
		// Shopify reports a grant this revocation drops, so it still holds it
		// even if the bridge sent the same revocation before, for example
		// after another tab granted it again.
		const stillReported = consentKeys.some(
			(name) => name in consent && visitor?.[name] === 'yes'
		);
		if (key === sentKey && !stillReported) {
			// Shopify already has the latest choice, for example after the
			// visitor went back to it while a newer request failed. That ends
			// the failed choice's retries.
			clearTimeout(retryTimer);
			failedKey = undefined;
			failures = 0;
			release();
			return;
		}
		// Set when a newer choice or a pending policy replaced this work.
		const isStale = () => latestKey() !== target;
		clearTimeout(retryTimer);
		sending = true;
		try {
			await setTrackingConsent(api, consent);
		} catch (error) {
			sending = false;
			reportError(error);
			if (isStale()) {
				// Send the newer choice, if any, without counting this failure.
				await flush();
				return;
			}
			// A revocation is new work even when its payload matches a choice
			// that ran out of retries.
			if (target !== failedKey) {
				failedKey = target;
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
		sent = { ...sent, ...consent };
		sentKey = key;
		failedKey = undefined;
		failures = 0;
		try {
			options.onSync?.(consent);
		} catch (error) {
			reportError(error);
		}
		if (isStale()) {
			// Release Hydrogen only once Shopify has the newest choice.
			await flush();
			return;
		}
		release();
	};

	const update = (snapshot: ShopifyConsentSnapshot): void => {
		const step = nextStep(snapshot);
		if (step === 'wait') {
			// Drop queued and in-flight work for the old policy.
			clearTimeout(retryTimer);
			failedKey = undefined;
			failures = 0;
			latest = undefined;
			return;
		}
		revoking = step !== 'send';
		holding = step === 'revoke';
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
