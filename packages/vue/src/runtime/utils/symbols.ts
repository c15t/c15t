import type { ConsentKernel, ConsentSnapshot } from '@c15t/core';
import type { ConsentActiveUI } from '@c15t/schema/config';
import type { InjectionKey, Ref } from 'vue';

import type { VueConsentKernelContext, VueConsentDisplayData } from '../kernel';

export const symbolInit = Symbol('c15t:init') as InjectionKey<
	Ref<VueConsentDisplayData | undefined>
>;
export const symbolConsent = Symbol('c15t:consent') as InjectionKey<
	Readonly<Ref<ConsentSnapshot['explicitChoice']>>
>;
export const symbolActiveUI = Symbol('c15t:activeUI') as InjectionKey<
	Ref<ConsentActiveUI>
>;
export const symbolKernel = Symbol(
	'c15t:kernel'
) as InjectionKey<ConsentKernel>;
export const symbolSnapshot = Symbol('c15t:snapshot') as InjectionKey<
	Ref<ConsentSnapshot>
>;
export const symbolKernelContext = Symbol(
	'c15t:kernel-context'
) as InjectionKey<VueConsentKernelContext>;
