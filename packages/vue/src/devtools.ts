import { createDevTools } from '@c15t/dev-tools';
import type {
	DevToolsInstance,
	DevToolsOptions,
	DevToolsPosition,
	DevToolsTab,
} from '@c15t/dev-tools';
import {
	defineComponent,
	h,
	inject,
	onMounted,
	onUnmounted,
	shallowRef,
	watch,
} from 'vue';
import type { PropType, WatchSource } from 'vue';

import { useConsentConfig } from './runtime/composables/config';
import { useConsentKernel } from './runtime/composables/kernel';
import { readDisplayedCategories } from './runtime/devtools/services';
import { symbolKernelContext } from './runtime/utils/symbols';

/** Props for the kernel-bound Vue DevTools adapter. */
export type ConsentDevToolsProps = Omit<
	DevToolsOptions,
	'container' | 'embedded' | 'kernel'
>;

/** Backward-compatible props name for {@link ConsentDevTools}. */
export type C15TDevToolsProps = ConsentDevToolsProps;

/** Compatible props name for the {@link DevTools} alias. */
export type DevToolsProps = ConsentDevToolsProps;

/** Props for {@link ConsentDevToolsPanel}. */
export type ConsentDevToolsPanelProps = Pick<
	DevToolsOptions,
	| 'clearRecords'
	| 'defaultTab'
	| 'getConsentCategories'
	| 'getPresentation'
	| 'maxEvents'
>;

const serviceProps = {
	clearRecords: Function as PropType<DevToolsOptions['clearRecords']>,
	defaultTab: String as PropType<DevToolsTab>,
	getConsentCategories: Function as PropType<
		DevToolsOptions['getConsentCategories']
	>,
	getPresentation: Function as PropType<DevToolsOptions['getPresentation']>,
	maxEvents: Number,
};

type Placement = Pick<
	DevToolsOptions,
	'container' | 'defaultOpen' | 'embedded' | 'position'
>;

/**
 * Keep one engine bound to the nearest provider. A change in a placement
 * source or a presentation option recreates it; service callbacks are read
 * live.
 */
const useProviderDevTools = (
	props: ConsentDevToolsPanelProps,
	placementSources: WatchSource[],
	getPlacement: () => Placement | undefined
): void => {
	const kernel = useConsentKernel();
	const config = useConsentConfig();
	const context = inject(symbolKernelContext, undefined);
	const getCategories = () =>
		readDisplayedCategories(
			kernel,
			props.getConsentCategories?.() ?? config.value.consentCategories
		);
	let devTools: DevToolsInstance | null = null;
	let stopWatching: (() => void) | undefined;

	onMounted(() => {
		stopWatching = watch(
			[
				...placementSources,
				() => props.defaultTab,
				() => props.maxEvents,
				() => JSON.stringify([...new Set(getCategories())].sort()),
				() => Boolean(props.clearRecords ?? context?.clearRecords),
			],
			() => {
				devTools?.destroy();
				devTools = null;
				const placement = getPlacement();
				if (!placement) {
					return;
				}
				devTools = createDevTools({
					...placement,
					clearRecords:
						props.clearRecords || context
							? () => (props.clearRecords ?? context?.clearRecords)?.()
							: undefined,
					defaultTab: props.defaultTab,
					getConsentCategories: getCategories,
					getPresentation: () =>
						props.getPresentation
							? props.getPresentation()
							: config.value.presentation,
					kernel,
					maxEvents: props.maxEvents,
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
};

/**
 * Mounts the c15t DevTools engine for the nearest Vue consent provider.
 *
 * @returns A renderless Vue component; the engine mounts into `document.body`.
 * @throws {Error} When rendered outside a consent provider.
 */
export const ConsentDevTools = defineComponent({
	name: 'ConsentDevTools',
	props: {
		...serviceProps,
		defaultOpen: Boolean,
		position: String as PropType<DevToolsPosition>,
	},
	setup(props) {
		useProviderDevTools(
			props,
			[() => props.defaultOpen, () => props.position],
			() => ({ defaultOpen: props.defaultOpen, position: props.position })
		);

		return function ConsentDevToolsRender() {
			return null;
		};
	},
});

/**
 * Embeds c15t DevTools in its parent element instead of floating over the
 * page. Use it to host the panel in another devtools UI or a debug page;
 * give the parent a height.
 *
 * @returns A `div` that the panel fills.
 * @throws {Error} When rendered outside a consent provider.
 *
 * @example
 * ```vue
 * <div style="height: 32rem">
 *   <ConsentDevToolsPanel default-tab="events" />
 * </div>
 * ```
 */
export const ConsentDevToolsPanel = defineComponent({
	name: 'ConsentDevToolsPanel',
	props: serviceProps,
	setup(props) {
		const container = shallowRef<HTMLDivElement | null>(null);
		useProviderDevTools(props, [container], () =>
			container.value
				? { container: container.value, embedded: true }
				: undefined
		);

		return function ConsentDevToolsPanelRender() {
			return h('div', {
				ref: container,
				style: { height: '100%', minHeight: 0, width: '100%' },
			});
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
