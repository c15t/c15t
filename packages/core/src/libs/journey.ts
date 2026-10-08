/**
 * Consent journey ids: what a server render hands the browser, and how
 * either side creates one.
 *
 * A journey id is a random UUID that rides on requests c15t already makes
 * (`GET /init`, `POST /subjects`, session reports) so a backend can link the
 * init a visitor was served to the save that followed. It is not the subject
 * id, it is never written to a cookie, and it is not derived from anything
 * about the visitor.
 */

import type { ConsentJourneyScope } from '@c15t/schema/types';

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
	 * The journey the server created for this render. The browser runtime
	 * uses this id instead of creating its own, so the save it sends links to
	 * the report the server made.
	 */
	journey?: { id: string };
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
