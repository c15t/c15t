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
import type { PersistedDevToolsOverrides } from './override-storage';
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
	onPersistOverrides?: (overrides: PersistedDevToolsOverrides) => void;
	onClearPersistedOverrides?: () => void;
	onCopyState?: (state: ConsentStoreState) => boolean | Promise<boolean>;
	onExportDebugBundle?: () => void;
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
	const {
		storeConnector,
		stateManager,
		enableEventLogging = true,
		onPersistOverrides,
		onClearPersistedOverrides,
		onCopyState,
		onExportDebugBundle,
	} = config;

	const getStoreState = (): ConsentStoreState | null =>
		storeConnector.getState();

	const logEvent = (
		type:
			| 'consent_set'
			| 'consent_save'
			| 'consent_reset'
			| 'error'
			| 'info'
			| 'network'
			| 'iab',
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
					onApplyOverrides: async (overrides) => {
						const store = storeConnector.getStore();
						if (store) {
							await store.getState().setOverrides({
								country: overrides.country,
								region: overrides.region,
								language: overrides.language,
								gpc: overrides.gpc,
							});
							logEvent('info', 'Overrides updated', {
								country: overrides.country,
								region: overrides.region,
								language: overrides.language,
								gpc: overrides.gpc,
							});
							onPersistOverrides?.({
								country: overrides.country,
								region: overrides.region,
								language: overrides.language,
								gpc: overrides.gpc,
							});
						}
					},
					onClearOverrides: async () => {
						const store = storeConnector.getStore();
						if (store) {
							await store.getState().setOverrides({
								country: undefined,
								region: undefined,
								language: undefined,
								gpc: undefined,
							});
							logEvent('info', 'Overrides cleared');
							onClearPersistedOverrides?.();
						}
					},
				});
				break;

			case 'scripts':
				renderScriptsPanel(container, {
					getState: getStoreState,
					getEvents: () => stateManager.getState().eventLog,
				});
				break;

			case 'iab':
				renderIabPanel(container, {
					getState: getStoreState,
					onSetPurposeConsent: (purposeId, value) => {
						const iab = storeConnector.getStore()?.getState().iab;
						if (!iab) {
							return;
						}
						iab.setPurposeConsent(purposeId, value);
						logEvent('iab', `IAB purpose ${purposeId} set to ${value}`);
					},
					onSetVendorConsent: (vendorId, value) => {
						const iab = storeConnector.getStore()?.getState().iab;
						if (!iab) {
							return;
						}
						iab.setVendorConsent(vendorId, value);
						logEvent('iab', `IAB vendor ${vendorId} set to ${value}`);
					},
					onSetSpecialFeatureOptIn: (featureId, value) => {
						const iab = storeConnector.getStore()?.getState().iab;
						if (!iab) {
							return;
						}
						iab.setSpecialFeatureOptIn(featureId, value);
						logEvent('iab', `IAB feature ${featureId} set to ${value}`);
					},
					onAcceptAll: () => {
						const iab = storeConnector.getStore()?.getState().iab;
						if (!iab) {
							return;
						}
						iab.acceptAll();
						logEvent('iab', 'IAB accept all selected');
					},
					onRejectAll: () => {
						const iab = storeConnector.getStore()?.getState().iab;
						if (!iab) {
							return;
						}
						iab.rejectAll();
						logEvent('iab', 'IAB reject all selected');
					},
					onSave: () => {
						const iab = storeConnector.getStore()?.getState().iab;
						if (!iab) {
							return;
						}
						void iab
							.save()
							.then(() => logEvent('iab', 'IAB preferences saved'))
							.catch((error: unknown) => {
								logEvent(
									'error',
									`Failed to save IAB preferences: ${String(error)}`
								);
							});
					},
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
							if (onCopyState) {
								const result = onCopyState(state);
								if (result instanceof Promise) {
									void result
										.then((ok) => {
											logEvent(
												ok ? 'info' : 'error',
												ok
													? 'State copied to clipboard'
													: 'Failed to copy state'
											);
										})
										.catch(() => {
											logEvent('error', 'Failed to copy state');
										});
								} else {
									logEvent(
										result ? 'info' : 'error',
										result
											? 'State copied to clipboard'
											: 'Failed to copy state'
									);
								}
							} else {
								void navigator.clipboard
									.writeText(JSON.stringify(state, null, 2))
									.then(() => {
										logEvent('info', 'State copied to clipboard');
									})
									.catch(() => {
										logEvent('error', 'Failed to copy state');
									});
							}
						}
					},
					onExportDebugBundle: onExportDebugBundle
						? () => {
								try {
									onExportDebugBundle();
									logEvent('info', 'Debug bundle exported');
								} catch {
									logEvent('error', 'Failed to export debug bundle');
								}
							}
						: undefined,
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
