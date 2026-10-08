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
