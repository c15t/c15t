import { createDevTools } from '@c15t/dev-tools';
import type {
	DevToolsInstance,
	DevToolsOptions,
	DevToolsPosition,
	DevToolsTab,
} from '@c15t/dev-tools';
import { defineComponent, onMounted, onUnmounted } from 'vue';
import type { PropType } from 'vue';

import { useConsentKernel } from './runtime/composables/kernel';

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
 */
export const ConsentDevTools = defineComponent({
	name: 'ConsentDevTools',
	props: {
		defaultOpen: Boolean,
		defaultTab: String as PropType<DevToolsTab>,
		maxEvents: Number,
		position: String as PropType<DevToolsPosition>,
	},
	setup(props) {
		const kernel = useConsentKernel();
		let devTools: DevToolsInstance | null = null;

		onMounted(() => {
			devTools = createDevTools({
				defaultOpen: props.defaultOpen,
				defaultTab: props.defaultTab,
				kernel,
				maxEvents: props.maxEvents,
				position: props.position,
			});
		});

		onUnmounted(() => {
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
