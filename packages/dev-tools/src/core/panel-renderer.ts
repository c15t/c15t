/**
 * Panel Renderer
 * Shared logic for rendering DevTools panels
 */

import type { ConsentStoreState } from 'c15t';
import { renderActionsPanel } from '../panels/actions';
import { renderConsentsPanel } from '../panels/consents';
import { renderEventsPanel } from '../panels/events';
import { renderIabPanel } from '../panels/iab';
import { renderLocationPanel } from '../panels/location';
import { renderScriptsPanel } from '../panels/scripts';
import { resetAllConsents } from './reset-consents';
import type { DevToolsTab, StateManager } from './state-manager';
import type { StoreConnector } from './store-connector';

/**
 * Configuration for the panel renderer
 */
export interface PanelRendererConfig {
	storeConnector: StoreConnector;
	stateManager: StateManager;
	/**
	 * Enable event logging for actions
	 * @default true
	 */
	enableEventLogging?: boolean;
}

/**
 * Panel renderer instance with methods for rendering panels
 */
export interface PanelRenderer {
	/**
	 * Renders the specified panel into the container
	 */
	renderPanel(container: HTMLElement, tab: DevToolsTab): void;

	/**
	 * Gets the current store state
	 */
	getStoreState(): ConsentStoreState | null;

	/**
	 * Resets all consents
	 */
	resetConsents(): Promise<void>;
}

/**
 * Creates a panel renderer with shared logic for rendering DevTools panels
 */
export function createPanelRenderer(
	config: PanelRendererConfig
): PanelRenderer {
	const { storeConnector, stateManager, enableEventLogging = true } = config;

	const getStoreState = (): ConsentStoreState | null =>
		storeConnector.getState();

	const logEvent = (
		type: 'consent_set' | 'consent_save' | 'consent_reset' | 'error' | 'info',
		message: string,
		data?: Record<string, unknown>
	): void => {
		if (enableEventLogging) {
			stateManager.addEvent({ type, message, data });
		}
	};

	const resetConsents = async (): Promise<void> => {
		const store = storeConnector.getStore();
		if (store) {
			await resetAllConsents(
				store,
				enableEventLogging ? stateManager : undefined
			);
		}
	};

	const renderPanel = (container: HTMLElement, tab: DevToolsTab): void => {
		switch (tab) {
			case 'consents':
				renderConsentsPanel(container, {
					getState: getStoreState,
					onConsentChange: (name, value) => {
						const store = storeConnector.getStore();
						if (store) {
							const consentName = String(name) as Parameters<
								ConsentStoreState['setSelectedConsent']
							>[0];
							store.getState().setSelectedConsent(consentName, value);
							logEvent(
								'info',
								`${consentName} toggled to ${value} (not saved)`,
								{
									name: consentName,
									value,
								}
							);
						}
					},
					onSave: () => {
						const store = storeConnector.getStore();
						if (store) {
							store.getState().saveConsents('custom');
							logEvent('consent_save', 'Saved consent preferences');
						}
					},
					onAcceptAll: () => {
						const store = storeConnector.getStore();
						if (store) {
							store.getState().saveConsents('all');
							logEvent('consent_save', 'Accepted all consents');
						}
					},
					onRejectAll: () => {
						const store = storeConnector.getStore();
						if (store) {
							store.getState().saveConsents('necessary');
							logEvent('consent_save', 'Rejected all optional consents');
						}
					},
					onReset: resetConsents,
				});
				break;

			case 'location':
				renderLocationPanel(container, {
					getState: getStoreState,
					onSetOverrides: async (overrides) => {
						const store = storeConnector.getStore();
						if (store) {
							const currentOverrides = store.getState().overrides || {};
							await store.getState().setOverrides({
								...currentOverrides,
								...overrides,
							});
							logEvent('info', 'Overrides updated', overrides);
							await store.getState().initConsentManager();
							logEvent(
								'info',
								'Consent manager re-initialized with new overrides'
							);
						}
					},
					onClearOverrides: async () => {
						const store = storeConnector.getStore();
						if (store) {
							await store.getState().setOverrides(undefined);
							logEvent('info', 'Overrides cleared');
							await store.getState().initConsentManager();
							logEvent('info', 'Consent manager re-initialized');
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
							logEvent(
								'info',
								`GPC override ${value === undefined ? 'cleared' : `set to ${value}`}`,
								{ gpc: value }
							);
						}
					},
				});
				break;

			case 'scripts':
				renderScriptsPanel(container, {
					getState: getStoreState,
				});
				break;

			case 'iab':
				renderIabPanel(container, {
					getState: getStoreState,
					onReset: resetConsents,
				});
				break;

			case 'events':
				renderEventsPanel(container, {
					getEvents: () => stateManager.getState().eventLog,
					onClear: () => {
						stateManager.clearEventLog();
						logEvent('info', 'Event log cleared');
					},
				});
				break;

			case 'actions':
				renderActionsPanel(container, {
					getState: getStoreState,
					onResetConsents: resetConsents,
					onRefetchBanner: async () => {
						const store = storeConnector.getStore();
						if (store) {
							await store.getState().initConsentManager();
							logEvent('info', 'Banner data refetched');
						}
					},
					onShowBanner: () => {
						const store = storeConnector.getStore();
						if (store) {
							store.getState().setActiveUI('banner', { force: true });
							logEvent('info', 'Banner shown');
						}
					},
					onOpenPreferences: () => {
						const store = storeConnector.getStore();
						if (store) {
							store.getState().setActiveUI('dialog');
							logEvent('info', 'Preferences dialog opened');
						}
					},
					onCopyState: () => {
						const state = getStoreState();
						if (state) {
							navigator.clipboard.writeText(JSON.stringify(state, null, 2));
							logEvent('info', 'State copied to clipboard');
						}
					},
				});
				break;
		}
	};

	return {
		renderPanel,
		getStoreState,
		resetConsents,
	};
}
