import { defaultConsentConfig } from '@c15t/schema/config';
import { defu } from 'defu';
import { computed, inject, toValue } from 'vue';
import type { ComputedRef, InjectionKey, MaybeRefOrGetter } from 'vue';

import type { ConsentConfig } from '../config';

export const consentConfigKey: InjectionKey<
	MaybeRefOrGetter<Partial<ConsentConfig> | undefined>
> = Symbol('c15t:config');

export const useConsentConfig =
	function useConsentConfig(): ComputedRef<ConsentConfig> {
		const injected = inject(consentConfigKey);

		return computed(
			() => defu(toValue(injected), defaultConsentConfig) as ConsentConfig
		);
	};
