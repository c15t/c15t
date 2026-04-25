import type { ConsentKernel } from 'c15t/v3';
import type { InjectionKey } from 'vue';

/**
 * Vue injection key carrying the kernel instance.
 *
 * Usage pattern (parent component):
 *   import { provide } from 'vue';
 *   import { kernelInjectionKey } from '@c15t/vue/v3';
 *   const kernel = createConsentKernel();
 *   provide(kernelInjectionKey, kernel);
 *
 * Or use the provided `<ConsentProvider />` component for ergonomics.
 */
export const kernelInjectionKey: InjectionKey<ConsentKernel> =
	Symbol('c15t:kernel');
