import { applyExperimentTheme } from '@c15t/core';
import { defaultConsentConfig } from '@c15t/schema/config';
import { applyThemeSlots } from '@c15t/ui/utils';
import { defu } from 'defu';
import { computed, inject, toValue } from 'vue';
import type { ComputedRef, InjectionKey, MaybeRefOrGetter } from 'vue';

import type { ConsentConfig } from '../config';
import { symbolKernelContext, symbolSnapshot } from '../utils/symbols';

export const consentConfigKey: InjectionKey<
	MaybeRefOrGetter<Partial<ConsentConfig> | undefined>
> = Symbol('c15t:config');

export const useConsentConfig =
	function useConsentConfig(): ComputedRef<ConsentConfig> {
		const injected = inject(consentConfigKey);
		// Optional: the config also serves components rendered without a
		// runtime, which then style the parts from the host theme alone.
		const context = inject(symbolKernelContext, undefined);
		const snapshot = inject(symbolSnapshot, undefined) ?? context?.snapshot;
		// Its own computed, so a snapshot that keeps the assignment does not
		// re-render every component that reads the config.
		const assignment = computed(() => snapshot?.value.experiment);

		return computed(() => {
			const config = defu(
				toValue(injected),
				defaultConsentConfig
			) as ConsentConfig;
			// The assigned arm's slots merge over the host's, the way
			// `useResolvedTheme` merges its tokens. The definition matches
			// `useExperimentDefinition`, which cannot be called from here.
			const theme = applyExperimentTheme(
				config.theme,
				context?.ownsKernel ? context.experimentDefinition : config.experiment,
				assignment.value
			);
			// `theme.slots` style the same parts as `components`, which win
			// where both set the same attribute.
			const components = applyThemeSlots(
				theme?.slots,
				config.components,
				'class'
			);
			return components === config.components
				? config
				: { ...config, components };
		});
	};
