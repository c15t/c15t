import type { ConsentSnapshot, ConsentState, KernelEvent } from '@c15t/core';
import type {
	ScriptDiagnostic,
	ScriptLoaderDebugEvent,
} from '@c15t/core/modules/script-loader';

/** Placement of the floating DevTools launcher and panel. */
export type DevToolsPosition =
	| 'bottom-right'
	| 'bottom-left'
	| 'top-right'
	| 'top-left';

/** Kernel views available in the first v3 DevTools release. */
export type DevToolsTab =
	| 'consents'
	| 'scripts'
	| 'location'
	| 'policy'
	| 'iab'
	| 'events'
	| 'actions';

/** A serializable entry captured from the kernel event bus. */
export interface DevToolsEvent {
	/** Instance-local event identifier. */
	readonly id: string;
	/** Kernel event name or script lifecycle action. */
	readonly type:
		| KernelEvent['type']
		| `script:${ScriptLoaderDebugEvent['action']}`;
	/** Human-readable summary. */
	readonly message: string;
	/** Capture time in milliseconds since the Unix epoch. */
	readonly timestamp: number;
	/** Optional JSON-safe diagnostic details. */
	readonly data?: Readonly<Record<string, unknown>>;
}

/** Immutable state exposed by a DevTools instance. */
export interface DevToolsState {
	readonly isOpen: boolean;
	readonly activeTab: DevToolsTab;
	readonly position: DevToolsPosition;
	readonly snapshot: ConsentSnapshot;
	/** Unsaved selections owned by this DevTools instance. */
	readonly draft: Readonly<Partial<ConsentState>>;
	/** Choice policy under which the current draft was first edited. */
	readonly draftFingerprint: string | null;
	readonly events: readonly DevToolsEvent[];
	readonly scripts: readonly ScriptDiagnostic[];
}

/**
 * Receives synchronous state changes until unsubscribed or destroyed.
 * @param state - State after the change.
 * @param previousState - State before the change.
 */
export type DevToolsStateListener = (
	state: DevToolsState,
	previousState: DevToolsState
) => void;

/** Owns one panel's state and subscriptions. Destroy releases all listeners. */
export interface StateManager {
	getState: () => DevToolsState;
	subscribe: (listener: DevToolsStateListener) => () => void;
	setOpen: (isOpen: boolean) => void;
	setActiveTab: (tab: DevToolsTab) => void;
	setSnapshot: (snapshot: ConsentSnapshot) => void;
	setDraft: (draft: Partial<ConsentState>) => void;
	setScripts: (scripts: readonly ScriptDiagnostic[]) => void;
	addEvent: (event: DevToolsEvent) => void;
	clearEvents: () => void;
	destroy: () => void;
}

/**
 * Create an isolated DevTools state store.
 * @param options - Initial snapshot, presentation, and event retention limit.
 * @returns A manager whose destroy method releases its subscriptions.
 */
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
		draft: Object.freeze({}),
		draftFingerprint: null,
		events: [],
		isOpen: options.isOpen,
		position: options.position,
		scripts: [],
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
		setDraft: (draft) =>
			update({
				draft: Object.freeze({ ...draft }),
				draftFingerprint:
					Object.keys(draft).length > 0
						? (state.draftFingerprint ??
							state.snapshot.evaluationPolicy.choice.fingerprint)
						: null,
			}),
		setOpen: (isOpen) => {
			if (state.isOpen !== isOpen) {
				update({ isOpen });
			}
		},
		setScripts: (scripts) => update({ scripts }),
		setSnapshot: (snapshot) => {
			if (state.snapshot !== snapshot) {
				const reset = snapshot.user !== state.snapshot.user;
				update({
					draft: reset ? Object.freeze({}) : state.draft,
					draftFingerprint: reset ? null : state.draftFingerprint,
					snapshot,
				});
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
