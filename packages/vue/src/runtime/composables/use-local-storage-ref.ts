import { ref, watch } from 'vue';
import type { Ref } from 'vue';

/**
 * A ref persisted to `localStorage` as JSON.
 *
 * SSR-safe: on the server the ref simply holds `defaultValue`. In the
 * browser the stored value is read synchronously on creation and every
 * change is written back; setting the ref to `null` removes the key.
 * Storage failures (private browsing, quota) are swallowed — persistence
 * is best-effort and must never break consent UI.
 *
 * @param key - The `localStorage` key to persist under
 * @param defaultValue - Value used when nothing is stored or storage is
 * unavailable
 * @returns A writable ref backed by `localStorage`
 */
export function useLocalStorageRef<StoredValue>(
	key: string,
	defaultValue: StoredValue
): Ref<StoredValue> {
	const stored = ref(defaultValue) as Ref<StoredValue>;

	if (typeof window === 'undefined') {
		return stored;
	}

	try {
		const raw = window.localStorage.getItem(key);
		if (raw !== null) {
			stored.value = JSON.parse(raw) as StoredValue;
		}
	} catch {
		// Unreadable or unparseable storage — keep the default.
	}

	watch(
		stored,
		(value) => {
			try {
				if (value == null) {
					window.localStorage.removeItem(key);
				} else {
					window.localStorage.setItem(key, JSON.stringify(value));
				}
			} catch {
				// Storage may be unavailable; skip persisting.
			}
		},
		{ deep: true }
	);

	return stored;
}
