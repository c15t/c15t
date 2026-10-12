import { getCurrentScope, onScopeDispose, ref } from 'vue';
import type { Ref } from 'vue';

export type UseStateInit<T> = (() => T) | T;

const resolveInit = function resolveInit<T>(init: UseStateInit<T>): T {
	if (typeof init === 'function') {
		return (init as () => T)();
	}

	return init;
};

/**
 * Keyed refs shared by every `useState` consumer. The store is torn down
 * when the last consuming component scope is disposed, so a fresh app
 * (or test) starts from clean state — the same lifecycle the previous
 * `createSharedComposable`-based implementation had.
 */
let store: Map<string, Ref<unknown>> | null = null;
let subscribers = 0;

const releaseStore = function releaseStore() {
	subscribers -= 1;
	if (subscribers <= 0) {
		subscribers = 0;
		store = null;
	}
};

/**
 * Plain-Vue stand-in for Nuxt's `useState`: a keyed ref shared across all
 * consumers for the lifetime of the app.
 *
 * @param key - Unique key identifying the shared state
 * @param init - Initial value, or a factory producing it
 * @returns The shared ref for `key`
 */
export const useState = function useState<T>(
	key: string,
	init: UseStateInit<T>
): Ref<T> {
	if (getCurrentScope()) {
		subscribers += 1;
		onScopeDispose(releaseStore);
	}

	if (!store) {
		store = new Map();
	}

	if (!store.has(key)) {
		store.set(key, ref(resolveInit(init)) as Ref<unknown>);
	}

	return store.get(key) as Ref<T>;
};
