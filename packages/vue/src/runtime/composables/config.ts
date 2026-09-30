import { defaultConsentConfig } from '@c15t/schema/config';
import { applyThemeSlots } from '@c15t/ui/utils';
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

		return computed(() => {
			const config = defu(
				toValue(injected),
				defaultConsentConfig
			) as ConsentConfig;
			// `theme.slots` style the same parts as `components`, which win
			// where both set the same attribute.
			const components = applyThemeSlots(
				config.theme?.slots,
				config.components,
				'class'
			);
			return components === config.components
				? config
				: { ...config, components };
		});
	};
