import type { ConsentSnapshot, KernelEvent } from '@c15t/core/v3';

/** Placement of the floating DevTools launcher and panel. */
export type DevToolsPosition =
	| 'bottom-right'
	| 'bottom-left'
	| 'top-right'
	| 'top-left';

/** Kernel views available in the first v3 DevTools release. */
export type DevToolsTab =
	| 'consents'
	| 'location'
	| 'policy'
	| 'iab'
	| 'events'
	| 'actions';

/** A serializable entry captured from the kernel event bus. */
export interface DevToolsEvent {
	readonly id: string;
	readonly type: KernelEvent['type'];
	readonly message: string;
	readonly timestamp: number;
	readonly data?: Readonly<Record<string, unknown>>;
}

/** Immutable state exposed by a DevTools instance. */
export interface DevToolsState {
	readonly isOpen: boolean;
	readonly activeTab: DevToolsTab;
	readonly position: DevToolsPosition;
	readonly snapshot: ConsentSnapshot;
	readonly events: readonly DevToolsEvent[];
}

export type DevToolsStateListener = (
	state: DevToolsState,
	previousState: DevToolsState
) => void;

export interface StateManager {
	getState: () => DevToolsState;
	subscribe: (listener: DevToolsStateListener) => () => void;
	setOpen: (isOpen: boolean) => void;
	setActiveTab: (tab: DevToolsTab) => void;
	setSnapshot: (snapshot: ConsentSnapshot) => void;
	addEvent: (event: DevToolsEvent) => void;
	clearEvents: () => void;
	destroy: () => void;
}

// oxlint-disable-next-line func-style -- Preserve the public factory declaration.
export function createStateManager(options: {
	snapshot: ConsentSnapshot;
	position: DevToolsPosition;
	isOpen: boolean;
	activeTab: DevToolsTab;
	maxEvents: number;
}): StateManager {
	let state: DevToolsState = {
		activeTab: options.activeTab,
		events: [],
		isOpen: options.isOpen,
		position: options.position,
		snapshot: options.snapshot,
	};
	let destroyed = false;
	const listeners = new Set<DevToolsStateListener>();

	// oxlint-disable-next-line func-style -- The helper is shared by every returned action.
	function update(partial: Partial<DevToolsState>): void {
		if (destroyed) {
			return;
		}
		const previousState = state;
		state = { ...state, ...partial };
		for (const listener of listeners) {
			listener(state, previousState);
		}
	}

	return {
		addEvent: (event) => {
			update({ events: [event, ...state.events].slice(0, options.maxEvents) });
		},
		clearEvents: () => {
			if (state.events.length > 0) {
				update({ events: [] });
			}
		},
		destroy: () => {
			destroyed = true;
			listeners.clear();
		},
		getState: () => state,
		setActiveTab: (activeTab) => {
			if (state.activeTab !== activeTab) {
				update({ activeTab });
			}
		},
		setOpen: (isOpen) => {
			if (state.isOpen !== isOpen) {
				update({ isOpen });
			}
		},
		setSnapshot: (snapshot) => {
			if (state.snapshot !== snapshot) {
				update({ snapshot });
			}
		},
		subscribe(listener) {
			if (destroyed) {
				// oxlint-disable-next-line no-empty-function -- A destroyed manager has nothing to unsubscribe.
				return () => {};
			}
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
}
