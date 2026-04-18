/**
 * Main DevTools Class
 * Orchestrates all components and state
 */

import {
	type ConsentStoreState,
	type ScriptDebugEvent,
	subscribeToScriptDebugEvents,
} from 'c15t';
import { createPanel, type PanelInstance } from '../components/panel';
import { createTabs, type TabsInstance } from '../components/tabs';
import {
	createDebugBundle,
	downloadDebugBundle,
	sanitizeStoreState,
} from './debug-bundle';
import {
	clearPersistedOverrides,
	loadPersistedOverrides,
	type PersistedDevToolsOverrides,
	persistOverrides,
} from './override-storage';
import { createPanelRenderer } from './panel-renderer';
import { button, clearElement, div } from './renderer';
import {
	createStateManager,
	type DevToolsPosition,
	type DevToolsTab,
} from './state-manager';
import { createStoreConnector } from './store-connector';
import { registerStoreInstrumentation } from './store-instrumentation';

// Import styles to ensure they're bundled
import '../styles/tokens.css';

const PANEL_HEIGHT_TRANSITION =
	'height var(--c15t-duration-normal, 200ms) var(--c15t-easing, cubic-bezier(0.4, 0, 0.2, 1))';
const PANEL_HEIGHT_TRANSITION_MS = 200;
const PANEL_HEIGHT_TRANSITION_BUFFER_MS = 80;

function normalizeOverridesForPersistence(
	overrides: ConsentStoreState['overrides'] | undefined
): PersistedDevToolsOverrides {
	return {
		country: overrides?.country?.trim() || undefined,
		region: overrides?.region?.trim() || undefined,
		language: overrides?.language?.trim() || undefined,
		gpc: overrides?.gpc,
	};
}

function persistedOverridesEqual(
	a: PersistedDevToolsOverrides,
	b: PersistedDevToolsOverrides
): boolean {
	return (
		a.country === b.country &&
		a.region === b.region &&
		a.language === b.language &&
		a.gpc === b.gpc
	);
}

interface PanelHeightAnimator {
	animate: (panel: HTMLElement, previousHeight: number) => void;
	destroy: () => void;
}

function prefersReducedMotion(): boolean {
	return (
		typeof window !== 'undefined' &&
		typeof window.matchMedia === 'function' &&
		window.matchMedia('(prefers-reduced-motion: reduce)').matches
	);
}

function createPanelHeightAnimator(): PanelHeightAnimator {
	let activePanel: HTMLElement | null = null;
	let frameId: number | null = null;
	let timeoutId: ReturnType<typeof setTimeout> | null = null;
	let removeTransitionListener: (() => void) | null = null;

	function clearAnimationState(): void {
		if (frameId !== null) {
			window.cancelAnimationFrame(frameId);
			frameId = null;
		}

		if (timeoutId !== null) {
			clearTimeout(timeoutId);
			timeoutId = null;
		}

		if (removeTransitionListener) {
			removeTransitionListener();
			removeTransitionListener = null;
		}

		if (activePanel) {
			activePanel.style.height = '';
			activePanel.style.transition = '';
			activePanel.style.willChange = '';
			activePanel = null;
		}
	}

	function animate(panel: HTMLElement, previousHeight: number): void {
		if (!Number.isFinite(previousHeight) || prefersReducedMotion()) {
			return;
		}

		const nextHeight = panel.getBoundingClientRect().height;

		if (
			!Number.isFinite(nextHeight) ||
			Math.abs(nextHeight - previousHeight) < 1
		) {
			return;
		}

		clearAnimationState();
		activePanel = panel;
		panel.style.height = `${previousHeight}px`;
		panel.style.willChange = 'height';

		// Force layout before transitioning to the new panel height.
		panel.getBoundingClientRect();

		const handleTransitionEnd = (event: Event): void => {
			const transitionEvent = event as TransitionEvent;
			if (
				typeof transitionEvent.propertyName === 'string' &&
				transitionEvent.propertyName &&
				transitionEvent.propertyName !== 'height'
			) {
				return;
			}

			clearAnimationState();
		};

		panel.addEventListener('transitionend', handleTransitionEnd);
		removeTransitionListener = () => {
			panel.removeEventListener('transitionend', handleTransitionEnd);
		};

		frameId = window.requestAnimationFrame(() => {
			frameId = null;
			panel.style.transition = PANEL_HEIGHT_TRANSITION;
			panel.style.height = `${nextHeight}px`;
		});

		// Fallback cleanup for interrupted transitions.
		timeoutId = setTimeout(() => {
			clearAnimationState();
		}, PANEL_HEIGHT_TRANSITION_MS + PANEL_HEIGHT_TRANSITION_BUFFER_MS);
	}

	return {
		animate,
		destroy: clearAnimationState,
	};
}

function createStateCopy(state: ConsentStoreState): Record<string, unknown> {
	return {
		consents: state.consents,
		selectedConsents: state.selectedConsents,
		consentInfo: state.consentInfo,
		locationInfo: state.locationInfo,
		model: state.model,
		overrides: state.overrides,
		scripts: state.scripts?.map((script: { id: string }) => ({
			id: script.id,
		})),
		loadedScripts: state.loadedScripts,
	};
}

interface EmbeddedTabsInstance {
	element: HTMLElement;
	setActiveTab: (tab: DevToolsTab) => void;
	destroy: () => void;
}

const EMBEDDED_TABS: Array<{ id: DevToolsTab; label: string }> = [
	{ id: 'location', label: 'Location' },
	{ id: 'policy', label: 'Policy' },
	{ id: 'consents', label: 'Consents' },
	{ id: 'scripts', label: 'Scripts' },
	{ id: 'iab', label: 'IAB' },
	{ id: 'actions', label: 'Actions' },
	{ id: 'events', label: 'Events' },
];

const EMBEDDED_THEME_VARIABLES: Record<string, string> = {
	'--c15t-surface': '#1f222b',
	'--c15t-surface-hover': '#272b35',
	'--c15t-surface-muted': '#252933',
	'--c15t-border': 'rgba(255, 255, 255, 0.08)',
	'--c15t-border-hover': 'rgba(255, 255, 255, 0.16)',
	'--c15t-text': '#eef2ff',
	'--c15t-text-muted': '#99a2b3',
	'--c15t-primary': '#8b5cf6',
	'--c15t-primary-hover': '#7c3aed',
	'--c15t-text-on-primary': '#f7f3ff',
	'--c15t-shadow-sm': 'none',
	'--c15t-shadow-md': 'none',
	'--c15t-devtools-surface-elevated': '#1f222b',
	'--c15t-devtools-surface-muted': '#272b35',
	'--c15t-devtools-surface-subtle': '#181b22',
	'--c15t-devtools-border-strong': 'rgba(255, 255, 255, 0.08)',
	'--c15t-devtools-code-surface': '#15181f',
	'--c15t-devtools-accent-soft': 'rgba(139, 92, 246, 0.18)',
	'--c15t-devtools-focus-ring': '#8b5cf6',
	'--c15t-devtools-badge-success-bg': 'rgba(16, 185, 129, 0.16)',
	'--c15t-devtools-badge-error-bg': 'rgba(248, 113, 113, 0.18)',
	'--c15t-devtools-badge-warning-bg': 'rgba(251, 191, 36, 0.18)',
	'--c15t-devtools-badge-info-bg': 'rgba(96, 165, 250, 0.18)',
	'--c15t-devtools-badge-neutral-bg': 'rgba(148, 163, 184, 0.16)',
	'--c15t-devtools-embedded-tab-active-border': 'rgba(139, 92, 246, 0.55)',
};

function createEmbeddedTabs(options: {
	activeTab: DevToolsTab;
	onTabChange: (tab: DevToolsTab) => void;
	disabledTabs?: DevToolsTab[];
}): EmbeddedTabsInstance {
	const { onTabChange, disabledTabs = [] } = options;
	let activeTab = options.activeTab;
	const buttons = new Map<DevToolsTab, HTMLButtonElement>();

	const tabList = div({
		role: 'tablist',
		ariaLabel: 'DevTools tabs',
		style: {
			display: 'flex',
			flexWrap: 'wrap',
			gap: '0.5rem',
			alignItems: 'center',
			paddingBottom: '0.25rem',
			borderBottom:
				'1px solid var(--c15t-devtools-border-strong, rgba(255, 255, 255, 0.08))',
		},
	});

	function applyButtonState(
		tab: DevToolsTab,
		buttonElement: HTMLButtonElement
	): void {
		const isActive = tab === activeTab;
		const isDisabled = disabledTabs.includes(tab);

		buttonElement.disabled = isDisabled;
		buttonElement.setAttribute('aria-selected', isActive ? 'true' : 'false');
		buttonElement.style.borderColor = isActive
			? 'var(--c15t-devtools-embedded-tab-active-border, rgba(139, 92, 246, 0.55))'
			: 'transparent';
		buttonElement.style.backgroundColor = isActive
			? 'var(--c15t-devtools-accent-soft, rgba(139, 92, 246, 0.18))'
			: 'transparent';
		buttonElement.style.color = isActive
			? 'var(--c15t-text, #eef2ff)'
			: 'var(--c15t-text-muted, #99a2b3)';
		buttonElement.style.opacity = isDisabled ? '0.45' : '1';
		buttonElement.style.cursor = isDisabled ? 'not-allowed' : 'pointer';
		buttonElement.style.boxShadow = isActive
			? 'inset 0 0 0 1px var(--c15t-devtools-embedded-tab-active-border, rgba(139, 92, 246, 0.55))'
			: 'none';
	}

	for (const tab of EMBEDDED_TABS) {
		const buttonElement = button({
			role: 'tab',
			text: tab.label,
			onClick: () => {
				if (disabledTabs.includes(tab.id)) {
					return;
				}
				activeTab = tab.id;
				for (const [tabId, tabButton] of buttons) {
					applyButtonState(tabId, tabButton);
				}
				onTabChange(tab.id);
			},
			style: {
				display: 'inline-flex',
				alignItems: 'center',
				justifyContent: 'center',
				minHeight: '1.875rem',
				padding: '0.3125rem 0.75rem',
				border: '1px solid transparent',
				borderRadius: '999px',
				backgroundColor: 'transparent',
				fontFamily: 'inherit',
				fontSize: 'var(--c15t-devtools-font-size-xs, 0.75rem)',
				fontWeight: '500',
				lineHeight: '1.25',
				transition:
					'background-color var(--c15t-duration-fast, 100ms) var(--c15t-easing, cubic-bezier(0.4, 0, 0.2, 1)), border-color var(--c15t-duration-fast, 100ms) var(--c15t-easing, cubic-bezier(0.4, 0, 0.2, 1)), box-shadow var(--c15t-duration-fast, 100ms) var(--c15t-easing, cubic-bezier(0.4, 0, 0.2, 1)), color var(--c15t-duration-fast, 100ms) var(--c15t-easing, cubic-bezier(0.4, 0, 0.2, 1))',
			},
		});

		if (tab.id === 'iab') {
			buttonElement.title = 'Available when IAB TCF mode is enabled';
		}

		applyButtonState(tab.id, buttonElement);
		buttons.set(tab.id, buttonElement);
		tabList.appendChild(buttonElement);
	}

	return {
		element: tabList,
		setActiveTab: (tab) => {
			activeTab = tab;
			for (const [tabId, tabButton] of buttons) {
				applyButtonState(tabId, tabButton);
			}
		},
		destroy: () => {
			buttons.clear();
		},
	};
}

function scriptDebugEventToLogEntry(event: ScriptDebugEvent): {
	type: 'script';
	message: string;
	data: Record<string, unknown>;
} {
	return {
		type: 'script',
		message: event.message,
		data: {
			...(event.data ?? {}),
			source: event.source,
			scope: event.scope,
			action: event.action,
			scriptId: event.scriptId,
			elementId: event.elementId,
			hasConsent: event.hasConsent,
			callback: event.callback,
			phase: event.phase,
			stepType: event.stepType,
			stepIndex: event.stepIndex,
		},
	};
}

/**
 * DevTools configuration options
 */
export interface DevToolsOptions {
	/**
	 * Namespace for the c15tStore on window
	 * @default 'c15tStore'
	 */
	namespace?: string;

	/**
	 * Initial position of the floating button
	 * @default 'bottom-right'
	 */
	position?: DevToolsPosition;

	/**
	 * Whether to start in open state
	 * @default false
	 */
	defaultOpen?: boolean;
}

/**
 * DevTools instance interface
 */
export interface DevToolsInstance {
	/** Opens the DevTools panel */
	open: () => void;
	/** Closes the DevTools panel */
	close: () => void;
	/** Toggles the DevTools panel */
	toggle: () => void;
	/** Gets the current state */
	getState: () => {
		isOpen: boolean;
		activeTab: DevToolsTab;
		isConnected: boolean;
	};
	/** Destroys the DevTools instance */
	destroy: () => void;
}

/**
 * Creates a DevTools instance
 */
export function createDevTools(
	options: DevToolsOptions = {}
): DevToolsInstance {
	const {
		namespace = 'c15tStore',
		position = 'bottom-right',
		defaultOpen = false,
	} = options;

	// Create state manager
	const stateManager = createStateManager({
		position,
		isOpen: defaultOpen,
	});
	let detachInstrumentation: (() => void) | null = null;
	let detachScriptDebug: (() => void) | null = null;

	// Create store connector
	const storeConnector = createStoreConnector({
		namespace,
		onConnect: (_state, store) => {
			detachInstrumentation?.();
			detachInstrumentation = registerStoreInstrumentation({
				namespace,
				store,
				onEvent: (event) => {
					stateManager.addEvent(event);
				},
			});
			detachScriptDebug?.();
			detachScriptDebug = subscribeToScriptDebugEvents((event) => {
				stateManager.addEvent(scriptDebugEventToLogEntry(event));
			});

			stateManager.setConnected(true);
			stateManager.addEvent({
				type: 'info',
				message: 'Connected to c15tStore',
			});

			const persistedOverrides = loadPersistedOverrides();
			if (persistedOverrides) {
				const currentOverrides = normalizeOverridesForPersistence(
					store.getState().overrides
				);

				if (!persistedOverridesEqual(persistedOverrides, currentOverrides)) {
					void store
						.getState()
						.setOverrides({
							country: persistedOverrides.country,
							region: persistedOverrides.region,
							language: persistedOverrides.language,
							gpc: persistedOverrides.gpc,
						})
						.then(() => {
							stateManager.addEvent({
								type: 'info',
								message: 'Applied persisted devtools overrides',
								data: {
									country: persistedOverrides.country,
									region: persistedOverrides.region,
									language: persistedOverrides.language,
									gpc: persistedOverrides.gpc,
								},
							});
						})
						.catch(() => {
							stateManager.addEvent({
								type: 'error',
								message: 'Failed to apply persisted devtools overrides',
							});
						});
				}
			}
		},
		onDisconnect: () => {
			stateManager.setConnected(false);
			detachInstrumentation?.();
			detachInstrumentation = null;
			detachScriptDebug?.();
			detachScriptDebug = null;
			stateManager.addEvent({
				type: 'error',
				message: 'Disconnected from c15tStore',
			});
		},
		onStateChange: () => {
			// Panel will re-render via subscription
		},
	});
	const panelRenderer = createPanelRenderer({
		storeConnector,
		stateManager,
		enableEventLogging: true,
		onPersistOverrides: persistOverrides,
		onClearPersistedOverrides: clearPersistedOverrides,
		onCopyState: async (state) => {
			try {
				await navigator.clipboard.writeText(
					JSON.stringify(createStateCopy(state), null, 2)
				);
				return true;
			} catch {
				return false;
			}
		},
		onExportDebugBundle: () => {
			const bundle = createDebugBundle({
				namespace,
				devToolsState: stateManager.getState(),
				connection: storeConnector.getDiagnostics(),
				recentEvents: stateManager.getState().eventLog.slice(0, 100),
				storeState: sanitizeStoreState(storeConnector.getState()),
			});
			downloadDebugBundle(bundle);
		},
	});

	// Create tabs instance
	let tabsInstance: TabsInstance | null = null;
	const panelHeightAnimator = createPanelHeightAnimator();

	// Create panel
	const panelInstance: PanelInstance = createPanel({
		stateManager,
		storeConnector,
		namespace,
		onRenderContent: (container) => {
			renderContent(container);
		},
	});

	/**
	 * Renders the content based on active tab
	 */
	function renderContent(container: HTMLElement): void {
		const panel = container.parentElement;
		const previousPanelHeight = panel?.getBoundingClientRect().height ?? 0;

		clearElement(container);

		// Determine disabled tabs based on store state
		const storeState = storeConnector.getState();
		const disabledTabs: DevToolsTab[] = [];

		// Disable IAB tab if model is not 'iab'
		if (!storeState || storeState.model !== 'iab') {
			disabledTabs.push('iab');
		}
		let currentActiveTab = stateManager.getState().activeTab;
		if (disabledTabs.includes(currentActiveTab)) {
			stateManager.setActiveTab('consents');
			currentActiveTab = 'consents';
		}

		// Always recreate tabs to update disabled state
		if (tabsInstance) {
			tabsInstance.destroy();
		}
		tabsInstance = createTabs({
			activeTab: currentActiveTab,
			onTabChange: (tab) => {
				stateManager.setActiveTab(tab);
			},
			disabledTabs,
		});

		container.appendChild(tabsInstance.element);

		// Create panel content container
		// Note: Scrolling is handled by the parent .content element from panel.module.css
		const panelContent = div({
			style: {
				display: 'flex',
				flexDirection: 'column',
				gap: '0',
			},
		});

		container.appendChild(panelContent);

		// Render active tab
		panelRenderer.renderPanel(panelContent, currentActiveTab);

		if (panel) {
			panelHeightAnimator.animate(panel, previousPanelHeight);
		}
	}

	// Create the instance
	const instance: DevToolsInstance = {
		open: () => stateManager.setOpen(true),
		close: () => stateManager.setOpen(false),
		toggle: () => stateManager.toggle(),
		getState: () => {
			const state = stateManager.getState();
			return {
				isOpen: state.isOpen,
				activeTab: state.activeTab,
				isConnected: state.isConnected,
			};
		},
		destroy: () => {
			detachInstrumentation?.();
			detachInstrumentation = null;
			detachScriptDebug?.();
			detachScriptDebug = null;

			panelHeightAnimator.destroy();
			tabsInstance?.destroy();
			panelInstance.destroy();
			storeConnector.destroy();
			stateManager.destroy();

			// Remove from window
			if (typeof window !== 'undefined') {
				delete (window as unknown as Record<string, unknown>).__c15tDevTools;
			}
		},
	};

	// Expose on window for console access
	if (typeof window !== 'undefined') {
		(window as unknown as Record<string, unknown>).__c15tDevTools = instance;
	}

	return instance;
}

/**
 * Creates a DevTools panel for embedding (used by TanStack plugin)
 */
export function createDevToolsPanel(options: {
	namespace?: string;
	mode?: 'standalone' | 'embedded';
}): {
	element: HTMLElement;
	destroy: () => void;
} {
	const { namespace = 'c15tStore', mode = 'standalone' } = options;
	const isEmbedded = mode === 'embedded';
	let detachInstrumentation: (() => void) | null = null;
	let detachScriptDebug: (() => void) | null = null;
	let contentArea: HTMLDivElement | null = null;

	// Create state manager without floating button behavior
	const stateManager = createStateManager({
		isOpen: true, // Always open in embedded mode
	});

	// Create store connector
	const storeConnector = createStoreConnector({
		namespace,
		onConnect: (state, store) => {
			detachInstrumentation?.();
			detachInstrumentation = registerStoreInstrumentation({
				namespace,
				store,
				onEvent: (event) => stateManager.addEvent(event),
			});
			detachScriptDebug?.();
			detachScriptDebug = subscribeToScriptDebugEvents((event) => {
				stateManager.addEvent(scriptDebugEventToLogEntry(event));
			});
			stateManager.setConnected(true);

			const persistedOverrides = loadPersistedOverrides();
			if (persistedOverrides) {
				const currentOverrides = normalizeOverridesForPersistence(
					state.overrides
				);
				if (!persistedOverridesEqual(persistedOverrides, currentOverrides)) {
					void store.getState().setOverrides({
						country: persistedOverrides.country,
						region: persistedOverrides.region,
						language: persistedOverrides.language,
						gpc: persistedOverrides.gpc,
					});
				}
			}
			renderActivePanel();
		},
		onDisconnect: () => {
			stateManager.setConnected(false);
			detachInstrumentation?.();
			detachInstrumentation = null;
			detachScriptDebug?.();
			detachScriptDebug = null;
			renderActivePanel();
		},
	});
	const panelRenderer = createPanelRenderer({
		storeConnector,
		stateManager,
		enableEventLogging: false,
		onPersistOverrides: persistOverrides,
		onClearPersistedOverrides: clearPersistedOverrides,
		onCopyState: async (state) => {
			try {
				await navigator.clipboard.writeText(
					JSON.stringify(createStateCopy(state), null, 2)
				);
				return true;
			} catch {
				return false;
			}
		},
		onExportDebugBundle: () => {
			const bundle = createDebugBundle({
				namespace,
				devToolsState: stateManager.getState(),
				connection: storeConnector.getDiagnostics(),
				recentEvents: stateManager.getState().eventLog.slice(0, 100),
				storeState: sanitizeStoreState(storeConnector.getState()),
			});
			downloadDebugBundle(bundle);
		},
	});

	// Create container
	const container = div({
		style: {
			display: 'flex',
			flexDirection: 'column',
			height: '100%',
			boxSizing: 'border-box',
			gap: '0.75rem',
			padding: '0.75rem',
			fontFamily: 'inherit',
			fontSize: 'var(--c15t-devtools-font-size-sm)',
			color: isEmbedded ? 'var(--c15t-text, #eef2ff)' : 'inherit',
			backgroundColor: 'transparent',
			colorScheme: isEmbedded ? 'dark' : undefined,
			...(isEmbedded ? EMBEDDED_THEME_VARIABLES : {}),
		},
	});

	// Create content area (before tabs so we can pass render function)
	contentArea = div({
		style: {
			flex: '1',
			minHeight: '0',
			overflowY: 'auto',
			overscrollBehavior: 'contain',
			backgroundColor: 'transparent',
		},
	});

	// Render active panel
	function renderActivePanel(): void {
		if (!contentArea) {
			return;
		}
		const activeTab = syncTabs();
		panelRenderer.renderPanel(contentArea, activeTab);
	}

	let tabsInstance: EmbeddedTabsInstance | null = null;
	let disabledTabsKey = '';

	function getDisabledTabs(): DevToolsTab[] {
		const disabledTabs: DevToolsTab[] = [];
		const storeState = storeConnector.getState();
		if (!storeState || storeState.model !== 'iab') {
			disabledTabs.push('iab');
		}
		return disabledTabs;
	}

	function syncTabs(): DevToolsTab {
		const disabledTabs = getDisabledTabs();
		const nextDisabledTabsKey = disabledTabs.join('|');
		let activeTab = stateManager.getState().activeTab;
		if (disabledTabs.includes(activeTab)) {
			activeTab = 'consents';
			stateManager.setActiveTab(activeTab);
		}

		if (!tabsInstance || disabledTabsKey !== nextDisabledTabsKey) {
			tabsInstance?.destroy();
			tabsInstance = createEmbeddedTabs({
				activeTab,
				onTabChange: (tab) => {
					stateManager.setActiveTab(tab);
					renderActivePanel();
				},
				disabledTabs,
			});
			disabledTabsKey = nextDisabledTabsKey;
			if (!tabsInstance.element.parentElement) {
				if (contentArea?.parentElement === container) {
					container.insertBefore(tabsInstance.element, contentArea);
				} else {
					container.appendChild(tabsInstance.element);
				}
			}
		} else {
			tabsInstance.setActiveTab(activeTab);
		}

		return activeTab;
	}

	syncTabs();
	container.appendChild(contentArea);

	// Initial render
	renderActivePanel();

	// Subscribe to store changes
	const unsubscribe = storeConnector.subscribe(() => {
		renderActivePanel();
	});

	return {
		element: container,
		destroy: () => {
			detachInstrumentation?.();
			detachInstrumentation = null;
			detachScriptDebug?.();
			detachScriptDebug = null;

			unsubscribe();
			tabsInstance?.destroy();
			storeConnector.destroy();
			stateManager.destroy();
		},
	};
}
