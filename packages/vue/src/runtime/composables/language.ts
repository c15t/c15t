import { computed } from 'vue';
import type { Ref } from 'vue';

import { useConsentKernelContext } from './kernel';

/**
 * The visitor's consent language as a writable ref.
 *
 * Assigning a new language code stores it and runs `init` again, so the
 * consent surfaces load their copy in that language. Assigning the current
 * language, or `null`, does nothing.
 *
 * @returns The language override, or `null` when none is set.
 *
 * @example
 * ```ts
 * const language = useConsentLanguage();
 * language.value = 'de';
 * ```
 */
export const useConsentLanguage = function useConsentLanguage(): Ref<
	string | null
> {
	const context = useConsentKernelContext();
	return computed({
		get: () => context.snapshot.value.overrides.language ?? null,
		set: (value) => {
			if (value) {
				context.runtime.setLanguage(value);
			}
		},
	});
};
