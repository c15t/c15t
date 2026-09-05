import { getConsentAvailableCategories } from '@c15t/core/consent-record';
import { createDevTools } from '@c15t/dev-tools';
import type {
	DevToolsInstance,
	DevToolsOptions,
	DevToolsPosition,
	DevToolsTab,
} from '@c15t/dev-tools';
import { defineComponent, inject, onMounted, onUnmounted, watch } from 'vue';
import type { PropType } from 'vue';

import { useConsentConfig } from './runtime/composables/config';
import { useConsentKernel } from './runtime/composables/kernel';
import { symbolInit } from './runtime/utils/symbols';

/** Props for the kernel-bound Vue DevTools adapter. */
export type ConsentDevToolsProps = Omit<
	DevToolsOptions,
	'container' | 'kernel'
>;

/** Backward-compatible props name for {@link ConsentDevTools}. */
export type C15TDevToolsProps = ConsentDevToolsProps;

/** Compatible props name for the {@link DevTools} alias. */
export type DevToolsProps = ConsentDevToolsProps;

/**
 * Mounts the c15t DevTools engine for the nearest Vue consent provider.
 *
 * @returns A renderless Vue component; the engine mounts into `document.body`.
 * @throws {Error} When rendered outside a consent provider.
 */
export const ConsentDevTools = defineComponent({
	name: 'ConsentDevTools',
	props: {
		defaultOpen: Boolean,
		defaultTab: String as PropType<DevToolsTab>,
		getConsentCategories: Function as PropType<
			DevToolsOptions['getConsentCategories']
		>,
		maxEvents: Number,
		position: String as PropType<DevToolsPosition>,
	},
	setup(props) {
		const kernel = useConsentKernel();
		const config = useConsentConfig();
		const init = inject(symbolInit, undefined);
		let devTools: DevToolsInstance | null = null;
		let stopWatching: (() => void) | undefined;

		onMounted(() => {
			stopWatching = watch(
				[
					() => props.defaultOpen,
					() => props.defaultTab,
					() => props.maxEvents,
					() => props.position,
					() =>
						JSON.stringify(
							props.getConsentCategories?.() ??
								getConsentAvailableCategories(
									init?.value,
									config.value.consentCategories
								)
						),
				],
				() => {
					devTools?.destroy();
					devTools = createDevTools({
						defaultOpen: props.defaultOpen,
						defaultTab: props.defaultTab,
						getConsentCategories: () =>
							props.getConsentCategories?.() ??
							getConsentAvailableCategories(
								init?.value,
								config.value.consentCategories
							),
						kernel,
						maxEvents: props.maxEvents,
						position: props.position,
					});
				},
				{ immediate: true }
			);
		});

		onUnmounted(() => {
			stopWatching?.();
			devTools?.destroy();
			devTools = null;
		});

		return function ConsentDevToolsRender() {
			return null;
		};
	},
});

/** Compatible short name for {@link ConsentDevTools}. */
export const DevTools = ConsentDevTools;

/** Backward-compatible name for {@link ConsentDevTools}. */
export const C15TDevTools = ConsentDevTools;

export default ConsentDevTools;

export type {
	DevToolsInstance,
	DevToolsOptions,
	DevToolsPosition,
	DevToolsTab,
};
