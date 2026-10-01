/**
 * Default consent storage keys (aligned with legacy c15t store).
 */

export const STORAGE_KEY_V2 = 'c15t';

export const STORAGE_KEY = 'privacy-consent-storage';

/** Failed v3 consent saves waiting for a backend replay. */
export const PENDING_SAVES_STORAGE_KEY = 'c15t-v3-pending-consent-saves:v1';

/**
 * The banner-experiment arm this browser was shown, as `{ id, variant }`.
 * Written only once the banner has rendered that arm.
 */
export const EXPERIMENT_STORAGE_KEY = 'c15t-experiment-v1';
