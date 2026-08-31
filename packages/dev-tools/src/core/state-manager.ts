/**
 * DevTools State Manager
 * Manages internal state for the DevTools UI
 */

const STORAGE_KEY = 'c15t-devtools-events';
const ACTIVE_TAB_STORAGE_KEY = 'c15t-devtools-active-tab';

/**
 * Load persisted events from sessionStorage
 */
const loadPersistedEvents = function loadPersistedEvents(): EventLogEntry[] {
	if (typeof window === 'undefined') {
		return [];
	}
	try {
		const stored = sessionStorage.getItem(STORAGE_KEY);
		if (stored) {
			return JSON.parse(stored) as EventLogEntry[];
		}
	} catch {
		// Ignore storage errors
	}
	return [];
};

/**
 * Persist events to sessionStorage
 */
const persistEvents = function persistEvents(events: EventLogEntry[]): void {
	if (typeof window === 'undefined') {
		return;
	}
	try {
		sessionStorage.setItem(STORAGE_KEY, JSON.stringify(events));
	} catch {
		// Ignore storage errors (quota exceeded, etc.)
	}
};

const isDevToolsTab = function isDevToolsTab(
	value: unknown
): value is DevToolsTab {
	return (
		value === 'consents' ||
		value === 'location' ||
		value === 'policy' ||
		value === 'scripts' ||
		value === 'iab' ||
		value === 'events' ||
		value === 'actions'
	);
};

const loadPersistedActiveTab =
	function loadPersistedActiveTab(): DevToolsTab | null {
		if (typeof window === 'undefined') {
			return null;
		}
		try {
			const stored = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
			if (isDevToolsTab(stored)) {
				return stored;
			}
		} catch {
			// Ignore storage errors
		}
		return null;
	};

const persistActiveTab = function persistActiveTab(tab: DevToolsTab): void {
	if (typeof window === 'undefined') {
		return;
	}
	try {
		localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, tab);
	} catch {
		// Ignore storage errors
	}
};

/**
 * Position options for the DevTools panel
 */
export type DevToolsPosition =
	| 'bottom-right'
	| 'bottom-left'
	| 'top-right'
	| 'top-left';

/**
 * Available tabs in the DevTools
 */
export type DevToolsTab =
	| 'consents'
	| 'location'
	| 'policy'
	| 'scripts'
	| 'iab'
	| 'events'
	| 'actions';

/**
 * Event log entry for debugging
 */
export interface EventLogEntry {
	id: string;
	type:
		| 'consent_set'
		| 'consent_save'
		| 'consent_reset'
		| 'error'
		| 'info'
		| 'network'
		| 'iab'
		| 'script';
	message: string;
	timestamp: number;
	data?: Record<string, unknown>;
}

/**
 * Internal state for DevTools
 */
export interface DevToolsState {
	/** Whether the panel is open */
	isOpen: boolean;
	/** Current active tab */
	activeTab: DevToolsTab;
	/** Position of the floating button and panel */
	position: DevToolsPosition;
	/** Whether the store is connected */
	isConnected: boolean;
	/** Event log for debugging */
	eventLog: EventLogEntry[];
	/** Maximum number of events to keep */
	maxEventLogSize: number;
}

/**
 * State change listener
 */
export type StateListener = (
	state: DevToolsState,
	prevState: DevToolsState
) => void;

/**
 * Creates a state manager for DevTools
 */
export const createStateManager = function createStateManager(
	initialState: Partial<DevToolsState> = {}
): StateManager {
	// Load persisted events from sessionStorage
	const persistedEvents = loadPersistedEvents();
	const persistedActiveTab = loadPersistedActiveTab();

	let state: DevToolsState = {
		activeTab: persistedActiveTab ?? 'location',
		eventLog: persistedEvents,
		isConnected: false,
		isOpen: false,
		maxEventLogSize: 100,
		position: 'bottom-right',
		...initialState,
	};

	const listeners = new Set<StateListener>();

	const notify = function notify(prevState: DevToolsState): void {
		for (const listener of listeners) {
			listener(state, prevState);
		}
	};

	const setState = function setState(partial: Partial<DevToolsState>): void {
		const prevState = state;
		state = { ...state, ...partial };
		notify(prevState);
	};

	return {
		addEvent: (entry) => {
			const newEvent: EventLogEntry = {
				...entry,
				id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
				timestamp: Date.now(),
			};

			const eventLog = [newEvent, ...state.eventLog].slice(
				0,
				state.maxEventLogSize
			);
			setState({ eventLog });
			// Persist to sessionStorage
			persistEvents(eventLog);
		},

		clearEventLog: () => {
			setState({ eventLog: [] });
			// Clear from sessionStorage
			persistEvents([]);
		},

		destroy: () => {
			listeners.clear();
		},

		getState: () => state,

		setActiveTab: (tab) => {
			setState({ activeTab: tab });
			persistActiveTab(tab);
		},

		setConnected: (isConnected) => {
			setState({ isConnected });
		},

		setOpen: (isOpen) => {
			setState({ isOpen });
		},

		setPosition: (position) => {
			setState({ position });
		},

		subscribe: (listener) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},

		toggle: () => {
			setState({ isOpen: !state.isOpen });
		},
	};
};

/**
 * State manager interface
 */
export interface StateManager {
	/** Get current state */
	getState: () => DevToolsState;
	/** Subscribe to state changes */
	subscribe: (listener: StateListener) => () => void;
	/** Set open state */
	setOpen: (isOpen: boolean) => void;
	/** Toggle open state */
	toggle: () => void;
	/** Set active tab */
	setActiveTab: (tab: DevToolsTab) => void;
	/** Set position */
	setPosition: (position: DevToolsPosition) => void;
	/** Set connection state */
	setConnected: (isConnected: boolean) => void;
	/** Add an event to the log */
	addEvent: (entry: Omit<EventLogEntry, 'id' | 'timestamp'>) => void;
	/** Clear the event log */
	clearEventLog: () => void;
	/** Cleanup */
	destroy: () => void;
}
