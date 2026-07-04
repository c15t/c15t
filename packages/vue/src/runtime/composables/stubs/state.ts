import { createSharedComposable } from '@vueuse/core';
import { type Ref, ref } from 'vue';

export type UseStateInit<T> = (() => T) | T;

function resolveInit<T>(init: UseStateInit<T>): T {
	if (typeof init === 'function') {
		return (init as () => T)();
	}

	return init;
}

const useStateShared = createSharedComposable(() => {
	const store = new Map<string, Ref<unknown>>();

	return function useState<T>(key: string, init: UseStateInit<T>): Ref<T> {
		if (!store.has(key)) {
			store.set(key, ref(resolveInit(init)) as Ref<unknown>);
		}

		return store.get(key) as Ref<T>;
	};
});

export function useState<T>(key: string, init: UseStateInit<T>): Ref<T> {
	return useStateShared()(key, init);
}
