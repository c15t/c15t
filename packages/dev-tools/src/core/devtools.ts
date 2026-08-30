import type {
	ConsentKernel,
	ConsentState,
	InitResult,
	KernelActiveUI,
	KernelOverrides,
	SaveResult,
} from '@c15t/core/v3';

import { KERNEL_EVENT_TYPES, kernelEventToDevToolsEvent } from './events';
import { createStateManager } from './state-manager';
import type {
	DevToolsPosition,
	DevToolsState,
	DevToolsStateListener,
	DevToolsTab,
} from './state-manager';
import { createDevToolsView } from './view';

import '../styles/dev-tools.css';

/** Options for a kernel-bound DevTools instance. */
export interface DevToolsOptions {
	/** Kernel to inspect. DevTools never discovers a kernel through globals. */
	kernel: ConsentKernel;
	/** Parent node for the imperative UI. Defaults to `document.body`. */
	container?: HTMLElement;
	/** Floating panel placement. @default 'bottom-right' */
	position?: DevToolsPosition;
	/** Whether the panel starts open. @default false */
	defaultOpen?: boolean;
	/** Initial panel. @default 'consents' */
	defaultTab?: DevToolsTab;
	/** Maximum captured kernel events. @default 100 */
	maxEvents?: number;
}

/** Kernel operations exposed by DevTools. */
export interface DevToolsActions {
	setConsent: (name: keyof ConsentState, value: boolean) => void;
	setOverrides: (overrides: KernelOverrides) => void;
	setActiveUI: (activeUI: KernelActiveUI) => void;
	init: () => Promise<InitResult>;
	save: (input?: Partial<ConsentState> | 'all' | 'none') => Promise<SaveResult>;
}

/** A live, isolated DevTools connection to one consent kernel. */
export interface DevToolsInstance {
	/** Root DOM node, or `null` outside a browser. */
	readonly element: HTMLElement | null;
	readonly actions: DevToolsActions;
	open: () => void;
	close: () => void;
	toggle: () => void;
	setActiveTab: (tab: DevToolsTab) => void;
	clearEvents: () => void;
	getState: () => DevToolsState;
	subscribe: (listener: DevToolsStateListener) => () => void;
	/** Releases kernel listeners and removes this instance's DOM. */
	destroy: () => void;
}

/**
 * Creates DevTools for one explicit c15t v3 kernel.
 *
 * The instance owns no global state. Multiple calls can inspect separate
 * kernels on the same page without sharing events, view state, or cleanup.
 *
 * @param options - Kernel and optional presentation settings.
 * @returns A live DevTools instance. Call `destroy()` during app cleanup.
 *
 * @example
 * ```ts
 * const devTools = createDevTools({ kernel });
 * devTools.open();
 * // Later: devTools.destroy();
 * ```
 */
// oxlint-disable-next-line func-style -- Preserve the documented public factory declaration.
export function createDevTools(options: DevToolsOptions): DevToolsInstance {
	const {
		kernel,
		container,
		position = 'bottom-right',
		defaultOpen = false,
		defaultTab = 'consents',
		maxEvents = 100,
	} = options;
	const eventLimit = Number.isFinite(maxEvents)
		? Math.max(1, Math.trunc(maxEvents))
		: 100;
	const stateManager = createStateManager({
		activeTab: defaultTab,
		isOpen: defaultOpen,
		maxEvents: eventLimit,
		position,
		snapshot: kernel.getSnapshot(),
	});
	let destroyed = false;
	let eventSequence = 0;

	const unsubscribeSnapshot = kernel.subscribe((snapshot) => {
		stateManager.setSnapshot(snapshot);
	});
	const unsubscribeEvents = KERNEL_EVENT_TYPES.map((type) =>
		kernel.events.on(type, (event) => {
			eventSequence += 1;
			stateManager.addEvent(
				kernelEventToDevToolsEvent(event, String(eventSequence), Date.now())
			);
		})
	);
	const view = createDevToolsView({ container, kernel, stateManager });

	const actions: DevToolsActions = {
		init: () => kernel.commands.init(),
		save: (input) => kernel.commands.save(input),
		setActiveUI: (activeUI) => kernel.set.activeUI(activeUI),
		setConsent(name, value) {
			const patch: Partial<ConsentState> = {};
			patch[name] = value;
			kernel.set.consent(patch);
		},
		setOverrides: (overrides) => kernel.set.overrides(overrides),
	};

	return {
		actions,
		clearEvents: stateManager.clearEvents,
		close: () => stateManager.setOpen(false),
		destroy() {
			if (destroyed) {
				return;
			}
			destroyed = true;
			unsubscribeSnapshot();
			for (const unsubscribe of unsubscribeEvents) {
				unsubscribe();
			}
			view.destroy();
			stateManager.destroy();
		},
		element: view.element,
		getState: stateManager.getState,
		open: () => stateManager.setOpen(true),
		setActiveTab: (tab) => stateManager.setActiveTab(tab),
		subscribe: stateManager.subscribe,
		toggle: () => {
			stateManager.setOpen(!stateManager.getState().isOpen);
		},
	};
}
