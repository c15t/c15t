/**
 * Consent journey ids: a random UUID on requests c15t already makes, so a
 * backend can link an init to the save that follows. Never the subject id.
 */

import { parseJourneyId, parseJourneyScope } from '@c15t/schema/types';
import type { ConsentJourneyScope } from '@c15t/schema/types';

import type { KernelJourney } from '../types';
import {
	JOURNEY_STORAGE_KEY,
	STORAGE_KEY,
	STORAGE_KEY_V2,
} from './storage-keys';

/**
 * Whether and how long a runtime keeps a consent journey id.
 *
 * - `'page'`: one id per page load, in memory only.
 * - `'tab'`: the id survives navigations in the same tab while a prompt is
 *   due, through `sessionStorage`, and is dropped once a choice is recorded.
 * - `false`: no journey; requests carry no journey parameters.
 */
export type ConsentJourneyOption = ConsentJourneyScope | false;

/** The journey a server render hands the browser in its state. */
export interface JourneyState {
	/**
	 * The journey the server started, which the browser continues. `null`
	 * when the server resolved the page without one: the browser sends none.
	 */
	journey?: { id: string } | null;
}

const toHex = (byte: number): string => byte.toString(16).padStart(2, '0');

/**
 * A new random journey id, or `undefined` when the runtime has no Web
 * Crypto. `crypto.randomUUID` needs a secure context, so a page served over
 * plain `http` builds the same version 4 UUID from `getRandomValues`.
 *
 * @returns A version 4 UUID, or `undefined`.
 */
export const createJourneyId = function createJourneyId(): string | undefined {
	const webCrypto = globalThis.crypto;
	if (typeof webCrypto?.randomUUID === 'function') {
		return webCrypto.randomUUID();
	}
	if (typeof webCrypto?.getRandomValues !== 'function') {
		return undefined;
	}
	const bytes = webCrypto.getRandomValues(new Uint8Array(16));
	// Version 4 in the high nibble of byte 6, the RFC 4122 variant in the
	// top two bits of byte 8.
	bytes[6] = ((bytes[6] ?? 0) % 16) + 0x40;
	bytes[8] = ((bytes[8] ?? 0) % 64) + 0x80;
	const hex = Array.from(bytes, toHex).join('');
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

/** The part of Web Storage a `'tab'` journey uses. */
export type JourneyStorage = Pick<
	Storage,
	'getItem' | 'removeItem' | 'setItem'
>;

/** `window.sessionStorage`, or `null` outside a browser. May throw. */
export const sessionStorageOf = (): JourneyStorage | null =>
	typeof window === 'undefined' ? null : window.sessionStorage;

/** A journey that was opened, and whether an earlier page started it. */
export interface OpenedJourney {
	journey: KernelJourney;
	/** The id came from `sessionStorage`: an earlier page of this tab. */
	continued: boolean;
}

/**
 * Open a journey: a `'tab'` journey continues the id in `sessionStorage`,
 * otherwise `adopted`, otherwise a new id. Unusable storage makes it a
 * `'page'` journey; a `'page'` journey never touches storage.
 *
 * @param options - The option, the stored flag, storage and an id to adopt.
 * @returns The journey, or `undefined` when it is off or no id can be made.
 * @internal
 */
export const openJourney = function openJourney(options: {
	option: ConsentJourneyOption | undefined;
	storedChoice: boolean;
	storage?: () => JourneyStorage | null;
	adopted?: string | null;
}): OpenedJourney | undefined {
	if (options.option === false) {
		return undefined;
	}
	let scope: ConsentJourneyScope = options.option ?? 'page';
	let previous: string | null = null;
	if (scope === 'tab') {
		try {
			const store = (options.storage ?? sessionStorageOf)();
			if (store) {
				previous = parseJourneyId(store.getItem(JOURNEY_STORAGE_KEY));
			} else {
				scope = 'page';
			}
		} catch {
			scope = 'page';
		}
	}
	const id = previous ?? parseJourneyId(options.adopted) ?? createJourneyId();
	if (!id) {
		return undefined;
	}
	return {
		continued: previous !== null,
		journey: Object.freeze({ id, scope, storedChoice: options.storedChoice }),
	};
};

/**
 * Window property holding the journey an early request (React's early
 * `/init`, the inline prefetch script) sent, for the runtime to continue.
 */
export const JOURNEY_WINDOW_KEY = '__c15tJourney';

type JourneyWindow = Window & { [JOURNEY_WINDOW_KEY]?: unknown };

/**
 * The journey an early request of this page started, if it is well formed.
 *
 * @returns The journey, or `undefined`.
 * @internal
 */
export const readEarlyJourney = function readEarlyJourney():
	| KernelJourney
	| undefined {
	if (typeof window === 'undefined') {
		return undefined;
	}
	const value = (window as JourneyWindow)[JOURNEY_WINDOW_KEY] as
		| Partial<KernelJourney>
		| null
		| undefined;
	const id = parseJourneyId(value?.id);
	const scope = parseJourneyScope(value?.scope);
	return id && scope && typeof value?.storedChoice === 'boolean'
		? { id, scope, storedChoice: value.storedChoice }
		: undefined;
};

/**
 * The journey a request sent before the runtime starts carries: this page's
 * early journey when one exists, otherwise a new one under the
 * {@link openJourney} rules, recorded for the runtime to continue.
 *
 * @param options - The `journey` option and whether a choice is stored.
 * @returns The journey, or `undefined` when it is off or outside a browser.
 * @internal
 */
export const claimEarlyJourney = function claimEarlyJourney(options: {
	option: ConsentJourneyOption | undefined;
	storedChoice: boolean;
	storage?: () => JourneyStorage | null;
}): KernelJourney | undefined {
	if (options.option === false || typeof window === 'undefined') {
		return undefined;
	}
	const existing = readEarlyJourney();
	if (existing) {
		return existing;
	}
	const opened = openJourney(options);
	if (opened) {
		(window as JourneyWindow)[JOURNEY_WINDOW_KEY] = opened.journey;
	}
	return opened?.journey;
};

/**
 * Whether a consent record is stored under `storageKey`, without decoding
 * it. The inline prefetch script runs the same check.
 *
 * @param storageKey - The consent storage key. Defaults to `c15t`.
 * @returns `true` when a record is present.
 * @internal
 */
export const hasStoredConsentRecord = function hasStoredConsentRecord(
	storageKey: string = STORAGE_KEY_V2
): boolean {
	if (typeof document === 'undefined') {
		return false;
	}
	try {
		if (
			document.cookie
				.split('; ')
				.some(
					(pair) =>
						pair.startsWith(`${storageKey}=`) &&
						pair.length > storageKey.length + 1
				)
		) {
			return true;
		}
	} catch {
		// Cookies blocked; localStorage may still answer.
	}
	try {
		return [
			storageKey,
			...(storageKey === STORAGE_KEY ? [] : [STORAGE_KEY]),
		].some((key) => window.localStorage.getItem(key) !== null);
	} catch {
		return false;
	}
};

/**
 * Journeys an init resolved locally with no request that carried them; a
 * save of one sends no journey, so it never names an unreported id.
 *
 * @returns What a transport records and checks.
 * @internal
 */
export const createUnreportedJourneys = function createUnreportedJourneys() {
	const ids = new Set<string>();
	return {
		/** An init carried this journey in a request (an `/init` or a report). */
		reported(journey: Pick<KernelJourney, 'id'> | undefined): void {
			if (journey) {
				ids.delete(journey.id);
			}
		},
		/** An init resolved this journey locally; nothing carried it. */
		resolvedLocally(journey: Pick<KernelJourney, 'id'> | undefined): void {
			if (journey) {
				ids.add(journey.id);
			}
		},
		/** The save without its journey when no request carried that id. */
		strip<Payload extends { journey?: Pick<KernelJourney, 'id'> }>(
			payload: Payload
		): Payload {
			if (!(payload.journey && ids.has(payload.journey.id))) {
				return payload;
			}
			const { journey: _unreported, ...rest } = payload;
			return rest as Payload;
		},
	};
};
