import type { AllConsentNames, ConsentState, Script } from '@c15t/core';

/** The Zaraz Consent API methods used by the bridge. */
export interface ZarazConsentApi {
	APIReady: boolean;
	modal?: unknown;
	getAll: () => Record<string, boolean>;
	set: (permissions: Record<string, boolean>) => void;
	sendQueuedEvents: () => void;
}

export interface CloudflareZarazOptions {
	/** Map c15t categories to purpose IDs from the Zaraz dashboard. */
	purposes: Partial<Record<AllConsentNames, readonly string[]>>;
	/** Hide the currently visible Zaraz modal. Disable auto-display in Zaraz too. @default true */
	hideBuiltInModal?: boolean;
	/** Replay Zaraz's queued pageview events after a denied purpose becomes allowed. @default true */
	sendQueuedEvents?: boolean;
	/**
	 * Called once after the first successful synchronization. With automatic
	 * pageviews disabled in Zaraz, send the initial Pageview from this callback.
	 */
	onReady?: () => void;
	/** Called when synchronization fails. Retried on the next consent update or readiness event. */
	onError?: (error: unknown) => void;
}

const consentCategories: readonly AllConsentNames[] = [
	'necessary',
	'functionality',
	'experience',
	'measurement',
	'marketing',
];
const readyEvent = 'zarazConsentAPIReady';

const isConsentApi = (api: unknown): api is ZarazConsentApi =>
	typeof api === 'object' &&
	api !== null &&
	'APIReady' in api &&
	api.APIReady === true &&
	'getAll' in api &&
	typeof api.getAll === 'function' &&
	'set' in api &&
	typeof api.set === 'function' &&
	'sendQueuedEvents' in api &&
	typeof api.sendQueuedEvents === 'function';

const getConsentApi = (): ZarazConsentApi | undefined => {
	if (typeof window === 'undefined' || !('zaraz' in window)) {
		return;
	}
	const { zaraz } = window;
	if (typeof zaraz !== 'object' || zaraz === null || !('consent' in zaraz)) {
		return;
	}
	return isConsentApi(zaraz.consent) ? zaraz.consent : undefined;
};

/**
 * Synchronize c15t effective permissions with externally loaded Zaraz tools.
 * Does not load Zaraz or configure tools. Unmapped Zaraz purposes are denied.
 * Disable automatic pageviews and send the first Pageview from onReady to avoid
 * running tools with a stale Zaraz consent cookie before synchronization.
 *
 * @param options - Purpose mapping and synchronization callbacks.
 * @returns A callback-only script for the existing c15t script loader.
 * @throws {Error} If the mapping is empty, contains blank IDs, or maps an ID twice.
 * @example
 * ```ts
 * cloudflareZaraz({ purposes: { measurement: ['analytics-purpose'] } });
 * ```
 */
export const cloudflareZaraz = (options: CloudflareZarazOptions): Script => {
	const mappings = new Map<string, AllConsentNames>();
	for (const category of consentCategories) {
		for (const purpose of options.purposes[category] ?? []) {
			if (!purpose.trim() || purpose !== purpose.trim()) {
				throw new Error(
					'Zaraz purpose IDs must be non-empty and have no surrounding whitespace.'
				);
			}
			if (mappings.has(purpose)) {
				throw new Error(`Zaraz purpose '${purpose}' is mapped more than once.`);
			}
			mappings.set(purpose, category);
		}
	}
	if (mappings.size === 0) {
		throw new Error('Map at least one Zaraz purpose to a c15t category.');
	}

	let latest: ConsentState | undefined;
	let listeningDocument: Document | undefined;
	let initialized = false;
	const synchronize = (): boolean => {
		const api = getConsentApi();
		if (!latest || !api) {
			return false;
		}
		const previous = api.getAll();
		const permissions: Record<string, boolean> = {};
		let changed = false;
		let granted = false;
		for (const purpose of Object.keys(previous)) {
			const category = mappings.get(purpose);
			const allowed = category !== undefined && latest[category] === true;
			// Purpose IDs are external keys, including names such as __proto__.
			Object.defineProperty(permissions, purpose, {
				enumerable: true,
				value: allowed,
			});
			changed ||= previous[purpose] !== allowed;
			granted ||= allowed && previous[purpose] !== true;
		}
		if (options.hideBuiltInModal !== false && api.modal === true) {
			api.modal = false;
		}
		if (changed) {
			api.set(permissions);
		}
		if (granted && options.sendQueuedEvents !== false) {
			api.sendQueuedEvents();
		}
		return true;
	};
	const apply = (): boolean => {
		try {
			if (!synchronize()) {
				return false;
			}
		} catch (error) {
			if (!options.onError) {
				throw error;
			}
			options.onError(error);
			return false;
		}
		listeningDocument?.removeEventListener(readyEvent, apply);
		listeningDocument = undefined;
		if (!initialized) {
			initialized = true;
			options.onReady?.();
		}
		return true;
	};
	const update: NonNullable<Script['onConsentChange']> = ({ consents }) => {
		latest = consents;
		if (typeof document === 'undefined' || apply()) {
			return;
		}
		if (!listeningDocument) {
			listeningDocument = document;
			document.addEventListener(readyEvent, apply);
		}
	};
	return {
		alwaysLoad: true,
		callbackOnly: true,
		category: 'necessary',
		id: 'cloudflare-zaraz',
		onConsentChange: (info) => {
			// Removing a configuration invokes onConsentChange with false before
			// onDispose. Do not start a synchronization during that teardown.
			if (info.hasConsent) {
				update(info);
			}
		},
		onDispose: () => {
			listeningDocument?.removeEventListener(readyEvent, apply);
			listeningDocument = undefined;
			latest = undefined;
			initialized = false;
		},
		onLoad: update,
	};
};
