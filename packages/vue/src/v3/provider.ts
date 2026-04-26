import {
	type ConsentKernel,
	createConsentKernel,
	createHostedTransport,
	createOfflineTransport,
	type KernelConfig,
} from 'c15t/v3';
import { defineComponent, onMounted, type PropType, provide } from 'vue';
import { kernelInjectionKey } from './context';

interface ProviderHostedOptions {
	headers?: Record<string, string>;
	fetch?: typeof globalThis.fetch;
}

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
			required: false,
		},
		options: {
			type: Object as PropType<
				KernelConfig & {
					mode?: 'hosted' | 'offline';
					backendURL?: string;
					domain?: string;
					headers?: ProviderHostedOptions['headers'];
					fetch?: ProviderHostedOptions['fetch'];
				}
			>,
			required: false,
		},
	},
	setup(props, { slots }) {
		const kernel =
			props.kernel ??
			createConsentKernel({
				...(props.options ?? {}),
				transport:
					props.options?.mode === 'hosted' || props.options?.backendURL
						? createHostedTransport({
								backendURL: props.options?.backendURL ?? '/api/c15t',
								domain: props.options?.domain,
								headers: props.options?.headers,
								fetch: props.options?.fetch,
							} as Parameters<typeof createHostedTransport>[0] & {
								domain?: string;
							})
						: createOfflineTransport(),
			});
		provide(kernelInjectionKey, kernel);
		onMounted(() => {
			if (!props.kernel) {
				void kernel.commands.init();
			}
		});
		return () => slots.default?.();
	},
});
