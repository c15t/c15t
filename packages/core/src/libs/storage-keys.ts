import type { StorageConfig } from './cookie';

/**
 * Default consent storage keys (aligned with legacy c15t store).
 */

export const STORAGE_KEY_V2 = 'c15t';

export const STORAGE_KEY = 'privacy-consent-storage';

/** Failed v3 consent saves waiting for a backend replay. */
export const PENDING_SAVES_STORAGE_KEY = 'c15t-v3-pending-consent-saves:v1';

/**
 * Subject ids the backend refused as another tenant's, each with the id this
 * browser moved to, so every tab moves to the same one. Cleared with the
 * queued saves.
 */
export const SUBJECT_REASSIGNMENTS_STORAGE_KEY =
	'c15t-v3-subject-reassignments:v1';

/**
 * The banner-experiment arm this browser was shown, as `{ id, variant }`.
 * Written only once the banner has rendered that arm.
 */
export const EXPERIMENT_STORAGE_KEY = 'c15t-experiment-v1';

/**
 * The consent journey id a `journey: 'tab'` runtime keeps in
 * `sessionStorage` while a prompt is due. Removed once a choice is recorded.
 */
export const JOURNEY_STORAGE_KEY = 'c15t-journey-v1';

/**
 * The storage keys one configuration resolves to. Notice dismissals,
 * vendor denials and the clear epoch get their own keys derived from the
 * consent key so a custom `storageKey` moves them all together.
 */
export interface ResolvedStorageKeys {
	consent: string;
	/** `null` when the configured key already is the legacy key. */
	legacyConsent: string | null;
	notice: string;
	/** Identity cookie bound to the notice acknowledgement. */
	noticeSubject: string;
	/** localStorage marker for dropped notice cookie writes. */
	noticeCookieMiss: string;
	vendors: string;
	/** Time of the last clear. Survives the clear it records. */
	epoch: string;
	/**
	 * localStorage only: the consent cookie as it stood when a consent write
	 * reached localStorage but not the cookie.
	 */
	cookieMiss: string;
}

export const resolveStorageKeys = function resolveStorageKeys(
	config?: StorageConfig
): ResolvedStorageKeys {
	const consent = config?.storageKey || STORAGE_KEY_V2;
	return {
		consent,
		cookieMiss: `${consent}-cookie-miss`,
		epoch: `${consent}-epoch`,
		legacyConsent: consent === STORAGE_KEY ? null : STORAGE_KEY,
		notice: `${consent}-notice`,
		noticeCookieMiss: `${consent}-notice-cookie-miss`,
		noticeSubject: `${consent}-notice-subject`,
		vendors: `${consent}-vendors`,
	};
};
