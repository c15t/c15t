/**
 * The arm a browser was shown, kept under {@link EXPERIMENT_STORAGE_KEY} so
 * a visitor keeps seeing the banner they saw. Read at start, when c15t picks
 * the arm; written by the experiment controller once the banner has shown
 * it. Holds `{ id, arm }` and nothing that identifies the visitor.
 */
import { deleteCookie, getRawCookieValue, setCookie } from './cookie';
import type { StorageConfig } from './cookie';
import { EXPERIMENT_STORAGE_KEY } from './storage-keys';

/** What the browser keeps between visits: the arm the banner showed. */
export interface StoredExperimentArm {
	/** The experiment id. */
	id: string;
	/** The arm the banner rendered. */
	arm: string;
}

const parseStored = function parseStored(
	raw: string | null | undefined
): StoredExperimentArm | null {
	if (!raw) {
		return null;
	}
	try {
		const parsed: unknown = JSON.parse(raw);
		if (typeof parsed !== 'object' || parsed === null) {
			return null;
		}
		const record = parsed as Record<string, unknown>;
		return typeof record.id === 'string' && typeof record.arm === 'string'
			? { arm: record.arm, id: record.id }
			: null;
	} catch {
		return null;
	}
};

const localStorageAvailable = function localStorageAvailable(): boolean {
	try {
		return typeof localStorage !== 'undefined' && localStorage !== null;
	} catch {
		return false;
	}
};

/**
 * Read the stored arm, from localStorage first and the cookie fallback
 * second. Never throws; unreadable storage reads as no record.
 *
 * @returns The stored arm, or `null`.
 */
export const readStoredExperimentArm =
	function readStoredExperimentArm(): StoredExperimentArm | null {
		if (localStorageAvailable()) {
			try {
				const stored = parseStored(
					localStorage.getItem(EXPERIMENT_STORAGE_KEY)
				);
				if (stored) {
					return stored;
				}
			} catch {
				// Fall through to the cookie.
			}
		}
		const raw = getRawCookieValue(EXPERIMENT_STORAGE_KEY);
		if (!raw) {
			return null;
		}
		try {
			return parseStored(decodeURIComponent(raw));
		} catch {
			return null;
		}
	};

/**
 * Persist the arm the banner showed. Writes localStorage when available and
 * falls back to a cookie otherwise. A successful localStorage write also
 * drops any fallback cookie a previous visit left, so a later read that has
 * to fall back to the cookie cannot restore an older arm. Never throws.
 *
 * @param record - The experiment id and arm.
 * @param storageConfig - Cookie domain and path for the fallback.
 */
export const writeStoredExperimentArm = function writeStoredExperimentArm(
	record: StoredExperimentArm,
	storageConfig?: StorageConfig
): void {
	const serialized = JSON.stringify({ arm: record.arm, id: record.id });
	if (localStorageAvailable()) {
		try {
			localStorage.setItem(EXPERIMENT_STORAGE_KEY, serialized);
			if (getRawCookieValue(EXPERIMENT_STORAGE_KEY)) {
				deleteCookie(EXPERIMENT_STORAGE_KEY, undefined, storageConfig);
			}
			return;
		} catch {
			// Quota or blocked storage: keep the cookie as the fallback.
		}
	}
	setCookie(
		EXPERIMENT_STORAGE_KEY,
		encodeURIComponent(serialized),
		undefined,
		storageConfig
	);
};
