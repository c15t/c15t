import { defaultConsentConfig } from '@c15t/config';
import { defu } from 'defu';
import {
	type ComputedRef,
	computed,
	type InjectionKey,
	inject,
	type MaybeRefOrGetter,
	toValue,
} from 'vue';
import type { ConsentConfig } from '../config';

export const consentConfigKey: InjectionKey<
	MaybeRefOrGetter<Partial<ConsentConfig> | undefined>
> = Symbol('c15t:config');

export function useConsentConfig(): ComputedRef<ConsentConfig> {
	const injected = inject(consentConfigKey);

	return computed(
		() => defu(toValue(injected), defaultConsentConfig) as ConsentConfig
	);
}
