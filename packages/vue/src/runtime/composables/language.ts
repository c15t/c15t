import { computed, type Ref } from 'vue';

import { useConsentKernelContext } from './kernel';

export function useConsentLanguage(): Ref<string | null> {
	const context = useConsentKernelContext();
	return computed({
		get: () => context.snapshot.value.overrides.language ?? null,
		set: (value) => {
			if (value) {
				context.kernel.set.language(value);
			}
		},
	});
}
