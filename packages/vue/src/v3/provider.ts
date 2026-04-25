import type { ConsentKernel } from 'c15t/v3';
import { defineComponent, h, type PropType, provide } from 'vue';
import { kernelInjectionKey } from './context';

/**
 * Vue <ConsentProvider /> — mirror of the React adapter's provider.
 *
 * Role: provide a kernel to descendants via Vue's `provide`. That's it.
 *
 * Intentional non-responsibilities (same as React):
 * - No watchers mirroring kernel state into Vue refs at the provider level.
 *   Composables subscribe per-slice inside consumer components.
 * - No cache patching. No method rewriting. No implicit network calls.
 *
 * For ergonomic use, consumers can skip the component entirely and just
 * call `provide(kernelInjectionKey, kernel)` themselves.
 */
export const ConsentProvider = defineComponent({
	name: 'ConsentProvider',
	props: {
		kernel: {
			type: Object as PropType<ConsentKernel>,
			required: true,
		},
	},
	setup(props, { slots }) {
		provide(kernelInjectionKey, props.kernel);
		return () => slots.default?.();
	},
});
