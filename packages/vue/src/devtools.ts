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
import { symbolKernelContext } from './runtime/utils/symbols';

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
		clearRecords: Function as PropType<DevToolsOptions['clearRecords']>,
		defaultOpen: Boolean,
		defaultTab: String as PropType<DevToolsTab>,
		getConsentCategories: Function as PropType<
			DevToolsOptions['getConsentCategories']
		>,
		getPresentation: Function as PropType<DevToolsOptions['getPresentation']>,
		maxEvents: Number,
		position: String as PropType<DevToolsPosition>,
	},
	setup(props) {
		const kernel = useConsentKernel();
		const config = useConsentConfig();
		const context = inject(symbolKernelContext, undefined);
		const getCategories = () => {
			const configured =
				props.getConsentCategories?.() ?? config.value.consentCategories;
			return [
				'necessary' as const,
				...kernel
					.getSnapshot()
					.policyRule.scope.filter(
						(name) => !configured?.length || configured.includes(name)
					),
			];
		};
		let devTools: DevToolsInstance | null = null;
		let stopWatching: (() => void) | undefined;

		onMounted(() => {
			stopWatching = watch(
				[
					() => props.defaultOpen,
					() => props.defaultTab,
					() => props.maxEvents,
					() => props.position,
					() => JSON.stringify([...new Set(getCategories())].sort()),
					() => Boolean(props.clearRecords ?? context?.clearRecords),
				],
				() => {
					devTools?.destroy();
					devTools = createDevTools({
						clearRecords:
							props.clearRecords || context
								? () => (props.clearRecords ?? context?.clearRecords)?.()
								: undefined,
						defaultOpen: props.defaultOpen,
						defaultTab: props.defaultTab,
						getConsentCategories: getCategories,
						getPresentation: () =>
							props.getPresentation
								? props.getPresentation()
								: config.value.presentation,
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
