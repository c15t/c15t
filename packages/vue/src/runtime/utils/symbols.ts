import type { ConsentActiveUI } from '@c15t/config';
import type { InitOutput } from '@c15t/schema';
import type { Consent } from '@c15t/utils';
import type { InjectionKey, Ref } from 'vue';

export const symbolInit = Symbol('c15t:init') as InjectionKey<
	Ref<InitOutput | undefined>
>;
export const symbolConsent = Symbol('c15t:consent') as InjectionKey<
	Ref<Consent>
>;
export const symbolActiveUI = Symbol('c15t:activeUI') as InjectionKey<
	Ref<ConsentActiveUI>
>;
