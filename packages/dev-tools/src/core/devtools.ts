/**
 * Main DevTools Class
 * Orchestrates all components and state
 */

import type { ConsentStoreState } from 'c15t';
import { createPanel, type PanelInstance } from '../components/panel';
import { createTabs, type TabsInstance } from '../components/tabs';
import { renderActionsPanel } from '../panels/actions';
import { renderConsentsPanel } from '../panels/consents';
import { renderEventsPanel } from '../panels/events';
import { renderIabPanel } from '../panels/iab';
import { renderLocationPanel } from '../panels/location';
import { renderScriptsPanel } from '../panels/scripts';
import { clearElement, div } from './renderer';
import { resetAllConsents } from './reset-consents';
import {
	createStateManager,
	type DevToolsPosition,
	type DevToolsTab,
	type StateManager,
} from './state-manager';
import { createStoreConnector, type StoreConnector } from './store-connector';

// Import styles to ensure they're bundled
import '../styles/tokens.css';

const PANEL_HEIGHT_TRANSITION =
	'height var(--c15t-duration-normal, 200ms) var(--c15t-easing, cubic-bezier(0.4, 0, 0.2, 1))';
const PANEL_HEIGHT_TRANSITION_MS = 200;
const PANEL_HEIGHT_TRANSITION_BUFFER_MS = 80;

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
	let timeoutId: ReturnType<typeof window.setTimeout> | null = null;
	let removeTransitionListener: (() => void) | null = null;

	function clearAnimationState(): void {
		if (frameId !== null) {
			window.cancelAnimationFrame(frameId);
			frameId = null;
		}

		if (timeoutId !== null) {
			window.clearTimeout(timeoutId);
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
		timeoutId = window.setTimeout(() => {
			clearAnimationState();
		}, PANEL_HEIGHT_TRANSITION_MS + PANEL_HEIGHT_TRANSITION_BUFFER_MS);
	}

	return {
		animate,
		destroy: clearAnimationState,
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

	// Track original callbacks to wrap them
	let originalCallbacks: {
		onBannerFetched?: unknown;
		onConsentSet?: unknown;
		onError?: unknown;
		onBeforeConsentRevocationReload?: unknown;
	} = {};

	// Create store connector
	const storeConnector = createStoreConnector({
		namespace,
		onConnect: (state, store) => {
			stateManager.setConnected(true);
			stateManager.addEvent({
				type: 'info',
				message: 'Connected to c15tStore',
			});

			// Hook into callbacks to log events
			// Save original callbacks
			originalCallbacks = { ...state.callbacks };

			// Wrap onBannerFetched
			store
				.getState()
				.setCallback(
					'onBannerFetched',
					(payload: { jurisdiction: unknown }) => {
						stateManager.addEvent({
							type: 'info',
							message: `Banner fetched: ${String(payload.jurisdiction)}`,
							data: payload,
						});
						// Call original if exists
						if (typeof originalCallbacks.onBannerFetched === 'function') {
							(originalCallbacks.onBannerFetched as (payload: unknown) => void)(
								payload
							);
						}
					}
				);

			// Wrap onConsentSet
			store
				.getState()
				.setCallback('onConsentSet', (payload: { preferences: unknown }) => {
					stateManager.addEvent({
						type: 'consent_set',
						message: 'Consent preferences updated',
						data: payload,
					});
					// Call original if exists
					if (typeof originalCallbacks.onConsentSet === 'function') {
						(originalCallbacks.onConsentSet as (payload: unknown) => void)(
							payload
						);
					}
				});

			// Wrap onError
			store.getState().setCallback('onError', (payload: { error: string }) => {
				stateManager.addEvent({
					type: 'error',
					message: `Error: ${payload.error}`,
					data: payload,
				});
				// Call original if exists
				if (typeof originalCallbacks.onError === 'function') {
					(originalCallbacks.onError as (payload: unknown) => void)(payload);
				}
			});

			// Wrap onBeforeConsentRevocationReload
			store
				.getState()
				.setCallback(
					'onBeforeConsentRevocationReload',
					(payload: { preferences: unknown }) => {
						stateManager.addEvent({
							type: 'info',
							message: 'Consent revocation - page will reload',
							data: payload,
						});
						// Call original if exists
						if (
							typeof originalCallbacks.onBeforeConsentRevocationReload ===
							'function'
						) {
							(
								originalCallbacks.onBeforeConsentRevocationReload as (
									payload: unknown
								) => void
							)(payload);
						}
					}
				);
		},
		onDisconnect: () => {
			stateManager.setConnected(false);
			stateManager.addEvent({
				type: 'error',
				message: 'Disconnected from c15tStore',
			});
		},
		onStateChange: () => {
			// Panel will re-render via subscription
		},
	});

	// Create tabs instance
	let tabsInstance: TabsInstance | null = null;
	const panelHeightAnimator = createPanelHeightAnimator();

	// Create panel
	const panelInstance: PanelInstance = createPanel({
		stateManager,
		storeConnector,
		onRenderContent: (container) => {
			renderContent(container, stateManager, storeConnector);
		},
	});

	/**
	 * Renders the content based on active tab
	 */
	function renderContent(
		container: HTMLElement,
		stateManager: StateManager,
		storeConnector: StoreConnector
	): void {
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

		// Always recreate tabs to update disabled state
		if (tabsInstance) {
			tabsInstance.destroy();
		}
		tabsInstance = createTabs({
			activeTab: stateManager.getState().activeTab,
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
		const state = stateManager.getState();
		const getStoreState = () => storeConnector.getState();

		switch (state.activeTab) {
			case 'consents':
				renderConsentsPanel(panelContent, {
					getState: getStoreState,
					onConsentChange: (name, value) => {
						const store = storeConnector.getStore();
						if (store) {
							// Update selected (pending) state, not saved state
							// Ensure name is always a string
							const consentName = String(name) as Parameters<
								ConsentStoreState['setSelectedConsent']
							>[0];
							store.getState().setSelectedConsent(consentName, value);
							stateManager.addEvent({
								type: 'info',
								message: `${consentName} toggled to ${value} (not saved)`,
								data: { name: consentName, value },
							});
						}
					},
					onSave: () => {
						const store = storeConnector.getStore();
						if (store) {
							store.getState().saveConsents('custom');
							stateManager.addEvent({
								type: 'consent_save',
								message: 'Saved consent preferences',
							});
						}
					},
					onAcceptAll: () => {
						const store = storeConnector.getStore();
						if (store) {
							store.getState().saveConsents('all');
							stateManager.addEvent({
								type: 'consent_save',
								message: 'Accepted all consents',
							});
						}
					},
					onRejectAll: () => {
						const store = storeConnector.getStore();
						if (store) {
							store.getState().saveConsents('necessary');
							stateManager.addEvent({
								type: 'consent_save',
								message: 'Rejected all optional consents',
							});
						}
					},
					onReset: async () => {
						const store = storeConnector.getStore();
						if (store) {
							await resetAllConsents(store, stateManager);
						}
					},
				});
				break;

			case 'location':
				renderLocationPanel(panelContent, {
					getState: getStoreState,
					onSetOverrides: async (overrides) => {
						const store = storeConnector.getStore();
						if (store) {
							const currentOverrides = store.getState().overrides || {};
							await store.getState().setOverrides({
								...currentOverrides,
								...overrides,
							});
							stateManager.addEvent({
								type: 'info',
								message: 'Overrides updated',
								data: overrides,
							});
							// Re-initialize consent manager to apply new overrides
							await store.getState().initConsentManager();
							stateManager.addEvent({
								type: 'info',
								message: 'Consent manager re-initialized with new overrides',
							});
						}
					},
					onClearOverrides: async () => {
						const store = storeConnector.getStore();
						if (store) {
							await store.getState().setOverrides(undefined);
							stateManager.addEvent({
								type: 'info',
								message: 'Overrides cleared',
							});
							// Re-initialize consent manager after clearing overrides
							await store.getState().initConsentManager();
							stateManager.addEvent({
								type: 'info',
								message: 'Consent manager re-initialized',
							});
						}
					},
					onSetGpcOverride: async (value) => {
						const store = storeConnector.getStore();
						if (store) {
							const currentOverrides = store.getState().overrides || {};
							// setOverrides already calls initConsentManager internally
							await store.getState().setOverrides({
								...currentOverrides,
								gpc: value,
							});
							stateManager.addEvent({
								type: 'info',
								message: `GPC override ${value === undefined ? 'cleared' : `set to ${value}`}`,
								data: { gpc: value },
							});
						}
					},
				});
				break;

			case 'scripts':
				renderScriptsPanel(panelContent, {
					getState: getStoreState,
				});
				break;

			case 'iab':
				renderIabPanel(panelContent, {
					getState: getStoreState,
					onReset: async () => {
						const store = storeConnector.getStore();
						if (store) {
							await resetAllConsents(store, stateManager);
						}
					},
				});
				break;

			case 'events':
				renderEventsPanel(panelContent, {
					getEvents: () => stateManager.getState().eventLog,
					onClear: () => {
						stateManager.clearEventLog();
						stateManager.addEvent({
							type: 'info',
							message: 'Event log cleared',
						});
					},
				});
				break;

			case 'actions':
				renderActionsPanel(panelContent, {
					getState: getStoreState,
					onResetConsents: async () => {
						const store = storeConnector.getStore();
						if (store) {
							await resetAllConsents(store, stateManager);
						}
					},
					onRefetchBanner: async () => {
						const store = storeConnector.getStore();
						if (store) {
							await store.getState().initConsentManager();
							stateManager.addEvent({
								type: 'info',
								message: 'Banner data refetched',
							});
						}
					},
					onShowBanner: () => {
						const store = storeConnector.getStore();
						if (store) {
							store.getState().setActiveUI('banner', { force: true });
							stateManager.addEvent({
								type: 'info',
								message: 'Banner shown',
							});
						}
					},
					onOpenPreferences: () => {
						const store = storeConnector.getStore();
						if (store) {
							store.getState().setActiveUI('dialog');
							stateManager.addEvent({
								type: 'info',
								message: 'Preference center opened',
							});
						}
					},
					onCopyState: () => {
						const state = storeConnector.getState();
						if (state) {
							const stateCopy = {
								consents: state.consents,
								consentInfo: state.consentInfo,
								locationInfo: state.locationInfo,
								model: state.model,
								overrides: state.overrides,
								scripts: state.scripts?.map((s: { id: string }) => ({
									id: s.id,
								})),
								loadedScripts: state.loadedScripts,
							};

							navigator.clipboard
								.writeText(JSON.stringify(stateCopy, null, 2))
								.then(() => {
									stateManager.addEvent({
										type: 'info',
										message: 'State copied to clipboard',
									});
								})
								.catch(() => {
									stateManager.addEvent({
										type: 'error',
										message: 'Failed to copy state',
									});
								});
						}
					},
				});
				break;
		}

		if (panel) {
			panelHeightAnimator.animate(panel, previousPanelHeight);
		}
	}

	// Subscribe to store changes to update panel
	storeConnector.subscribe(() => {
		panelInstance.update();
	});

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
	const { namespace = 'c15tStore' } = options;

	// Create state manager without floating button behavior
	const stateManager = createStateManager({
		isOpen: true, // Always open in embedded mode
	});

	// Create store connector
	const storeConnector = createStoreConnector({
		namespace,
		onConnect: () => stateManager.setConnected(true),
		onDisconnect: () => stateManager.setConnected(false),
	});

	// Create container
	const container = div({
		style: {
			display: 'flex',
			flexDirection: 'column',
			height: '100%',
			fontFamily: 'var(--c15t-devtools-font-family)',
			fontSize: 'var(--c15t-devtools-font-size-sm)',
			color: 'var(--c15t-devtools-text)',
			backgroundColor: 'var(--c15t-devtools-surface)',
		},
	});

	// Create content area (before tabs so we can pass render function)
	const contentArea = div({
		style: {
			flex: '1',
			overflowY: 'auto',
			overscrollBehavior: 'contain',
		},
	});

	// Render active panel
	function renderActivePanel(): void {
		const state = stateManager.getState();
		const getStoreState = () => storeConnector.getState();

		switch (state.activeTab) {
			case 'consents':
				renderConsentsPanel(contentArea, {
					getState: getStoreState,
					onConsentChange: (name, value) => {
						// Update selected (pending) state, not saved state
						storeConnector
							.getStore()
							?.getState()
							.setSelectedConsent(
								name as Parameters<ConsentStoreState['setSelectedConsent']>[0],
								value
							);
					},
					onSave: () => {
						storeConnector.getStore()?.getState().saveConsents('custom');
					},
					onAcceptAll: () => {
						storeConnector.getStore()?.getState().saveConsents('all');
					},
					onRejectAll: () => {
						storeConnector.getStore()?.getState().saveConsents('necessary');
					},
					onReset: async () => {
						const store = storeConnector.getStore();
						if (store) {
							await resetAllConsents(store);
						}
					},
				});
				break;

			case 'location':
				renderLocationPanel(contentArea, {
					getState: getStoreState,
					onSetOverrides: async (overrides) => {
						const store = storeConnector.getStore();
						if (store) {
							const current = store.getState().overrides || {};
							await store.getState().setOverrides({ ...current, ...overrides });
						}
					},
					onClearOverrides: async () => {
						await storeConnector.getStore()?.getState().setOverrides(undefined);
					},
					onSetGpcOverride: async (value) => {
						const store = storeConnector.getStore();
						if (store) {
							const current = store.getState().overrides || {};
							// setOverrides already calls initConsentManager internally
							await store.getState().setOverrides({ ...current, gpc: value });
						}
					},
				});
				break;

			case 'scripts':
				renderScriptsPanel(contentArea, {
					getState: getStoreState,
				});
				break;

			case 'iab':
				renderIabPanel(contentArea, {
					getState: getStoreState,
					onReset: async () => {
						const store = storeConnector.getStore();
						if (store) {
							await resetAllConsents(store);
						}
					},
				});
				break;

			case 'events':
				renderEventsPanel(contentArea, {
					getEvents: () => stateManager.getState().eventLog,
					onClear: () => {
						stateManager.clearEventLog();
					},
				});
				break;

			case 'actions':
				renderActionsPanel(contentArea, {
					getState: getStoreState,
					onResetConsents: async () => {
						const store = storeConnector.getStore();
						if (store) {
							await resetAllConsents(store);
						}
					},
					onRefetchBanner: async () => {
						await storeConnector.getStore()?.getState().initConsentManager();
					},
					onShowBanner: () => {
						storeConnector
							.getStore()
							?.getState()
							.setActiveUI('banner', { force: true });
					},
					onOpenPreferences: () => {
						storeConnector.getStore()?.getState().setActiveUI('dialog');
					},
					onCopyState: () => {
						const state = storeConnector.getState();
						if (state) {
							navigator.clipboard.writeText(JSON.stringify(state, null, 2));
						}
					},
				});
				break;
		}
	}

	// Determine disabled tabs based on store state
	const storeState = storeConnector.getState();
	const disabledTabs: DevToolsTab[] = [];

	// Disable IAB tab if model is not 'iab'
	if (!storeState || storeState.model !== 'iab') {
		disabledTabs.push('iab');
	}

	// Create tabs
	const tabsInstance = createTabs({
		activeTab: stateManager.getState().activeTab,
		onTabChange: (tab) => {
			stateManager.setActiveTab(tab);
			renderActivePanel();
		},
		disabledTabs,
	});

	container.appendChild(tabsInstance.element);
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
			unsubscribe();
			tabsInstance.destroy();
			storeConnector.destroy();
			stateManager.destroy();
		},
	};
}
