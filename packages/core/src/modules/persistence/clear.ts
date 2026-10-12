/**
 * Clearing stored records: every c15t record removed, then the clear epoch
 * stored.
 *
 * First-load code, unlike the other writes in `writer/`. `clear()` runs it
 * before it returns, so a reload right after a clear, or write code that
 * never loads, cannot bring a cleared grant back. It uses only functions
 * the read path already loads.
 *
 * @internal
 */
import type { CookieOptions } from '../../libs/cookie';
import { deleteCookie, writeCookie } from '../../libs/cookie';
import { EPOCH_CLOCK_TOLERANCE_MS } from './record-codec';
import { readStoredClearEpoch, resolveStorageKeys } from './record-storage';
import type { StorageConfig } from './types';

const removeLocalStorageKey = function removeLocalStorageKey(
	key: string
): void {
	try {
		window.localStorage?.removeItem(key);
	} catch {
		// Blocked storage: the read path reports it, and holds nothing here.
	}
};

/**
 * Removes explicit choices (configured and legacy keys, cookie and
 * localStorage), the notice dismissal and the vendor denials with their
 * cookie projections, the legacy `<key>-privacy` record an alpha may have
 * left, and the IAB records. Cookie deletion uses the same domain handling
 * as writes so a cross-subdomain cookie is actually removed.
 *
 * Queued backend replays and subject reassignments are the kernel's save
 * outbox: the kernel drops them on the `records:cleared` event that follows
 * a clear.
 *
 * @internal
 */
export const clearStoredConsentRecords = function clearStoredConsentRecords(
	cookie?: CookieOptions,
	config?: StorageConfig
): void {
	if (typeof document === 'undefined') {
		return;
	}
	const keys = resolveStorageKeys(config);
	// v3 alphas stored standing GPC directives under `<key>-privacy`. GPC is
	// a live signal now and never persisted, but clearing still deletes what
	// an alpha left behind.
	const both = [
		keys.consent,
		keys.legacyConsent,
		keys.notice,
		`${keys.consent}-privacy`,
		keys.vendors,
	];
	// localStorage first, then the cookies.
	for (const key of [...both, keys.cookieMiss]) {
		if (key) {
			removeLocalStorageKey(key);
		}
	}
	for (const key of both) {
		if (key) {
			deleteCookie(key, cookie, config);
		}
	}
	// Addon bytes must be removed even when the addon is not mounted.
	removeLocalStorageKey('c15t-iab-authority-v1');
	removeLocalStorageKey('euconsent-v2');
	deleteCookie('euconsent-v2', cookie, config);
	deleteCookie('euconsent-v2');
};

/**
 * Serializes the clear epoch record: the time of the last `clear()` in
 * epoch milliseconds, as plain decimal digits. The same text is stored in
 * the `<key>-epoch` cookie and localStorage entry.
 *
 * @internal
 */
export const encodeClearEpoch = function encodeClearEpoch(
	epoch: number
): string {
	return String(epoch);
};

/**
 * Writes the clear epoch to localStorage and its cookie. Never removed by a
 * clear, so every runtime can tell decisions made before the clear from
 * later ones.
 *
 * @internal
 */
export const writeStoredClearEpoch = function writeStoredClearEpoch(
	epoch: number,
	config: StorageConfig | undefined,
	cookie?: CookieOptions
): void {
	const key = resolveStorageKeys(config).epoch;
	const text = encodeClearEpoch(epoch);
	try {
		window.localStorage?.setItem(key, text);
	} catch {
		// Blocked or full storage: the cookie copy still carries the epoch.
	}
	writeCookie(key, text, cookie, config);
};

/**
 * Remove every stored record and store the clear epoch for a clear made at
 * `at`. A no-op without a document.
 *
 * @param config - Where the records live.
 * @param at - When the clear happened.
 * @param knownEpoch - The newest epoch the caller has read, so the new one
 * is past it even when storage lost it.
 * @internal
 */
export const clearStoredRecords = function clearStoredRecords(
	config: StorageConfig | undefined,
	at: number,
	knownEpoch: number
): void {
	if (typeof document === 'undefined') {
		return;
	}
	clearStoredConsentRecords(undefined, config);
	// The epoch outlives the clear it records: decisions confirmed before it
	// stay void wherever another runtime writes them back. Always past the
	// previous epoch, even when the clock went back: a lower epoch would let
	// decisions between the two back in.
	const previous = Math.max(knownEpoch, readStoredClearEpoch(config, at));
	// Never further ahead of the clock than readers accept, or every runtime
	// whose clock is behind would read the epoch as corrupt (0) and void
	// nothing. Known limit: after the clock went back more than the
	// tolerance, the capped epoch is below times cleared records carried, so
	// a decision with such a time that a runtime which missed the clear
	// writes back counts again once clocks recover. Times alone cannot order
	// that case.
	writeStoredClearEpoch(
		Math.max(at, Math.min(previous + 1, at + EPOCH_CLOCK_TOLERANCE_MS)),
		config
	);
};
