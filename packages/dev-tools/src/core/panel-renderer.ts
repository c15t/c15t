/**
 * Panel Renderer
 * Shared logic for rendering DevTools panels
 */

import type {
	ConsentKernel,
	ConsentSnapshot,
	ConsentState,
	KernelIABState,
} from '@c15t/core';

import { renderActionsPanel } from '../panels/actions';
import { renderConsentsPanel } from '../panels/consents';
import { renderEventsPanel } from '../panels/events';
import { renderIabPanel } from '../panels/iab';
import { renderLocationPanel } from '../panels/location';
import { renderPolicyPanel } from '../panels/policy';
import { renderScriptsPanel } from '../panels/scripts';
import type { PersistedDevToolsOverrides } from './override-storage';
import { resetAllConsents } from './reset-consents';
import type { ScriptRegistry } from './script-registry';
import type { DevToolsTab, StateManager } from './state-manager';
import type { StoreConnector } from './store-connector';

/**
 * Configuration for the panel renderer
 */
export interface PanelRendererConfig {
	storeConnector: StoreConnector;
	stateManager: StateManager;
	scriptRegistry: ScriptRegistry;
	/**
	 * Window namespace shown in the console API hints
	 */
	namespace?: string;
	/**
	 * Enable event logging for actions
	 * @default true
	 */
	enableEventLogging?: boolean;
	onPersistOverrides?: (overrides: PersistedDevToolsOverrides) => void;
	onClearPersistedOverrides?: () => void;
	onCopyState?: (state: ConsentSnapshot) => boolean | Promise<boolean>;
	onExportDebugBundle?: () => void;
}

/**
 * Panel renderer instance with methods for rendering panels
 */
export interface PanelRenderer {
	/**
	 * Renders the specified panel into the container
	 */
	renderPanel: (container: HTMLElement, tab: DevToolsTab) => void;

	/**
	 * Gets the current kernel snapshot
	 */
	getStoreState: () => ConsentSnapshot | null;

	/**
	 * Resets all consents
	 */
	resetConsents: () => Promise<void>;
}

const readIab = function readIab(
	kernel: ConsentKernel
): Readonly<KernelIABState> | null {
	return kernel.getSnapshot().iab;
};

const buildFlags = function buildFlags(
	ids: Iterable<string | number>,
	value: boolean
): Record<string, boolean> {
	const flags: Record<string, boolean> = {};
	for (const id of ids) {
		flags[String(id)] = value;
	}
	return flags;
};

/**
 * Flips every purpose, special feature, and vendor known to the GVL (plus
 * custom vendors) to `value`.
 */
const setAllIabConsents = function setAllIabConsents(
	kernel: ConsentKernel,
	value: boolean
): boolean {
	const iab = readIab(kernel);
	if (!iab) {
		return false;
	}
	const purposeIds = Object.keys(iab.gvl?.purposes ?? {});
	const featureIds = Object.keys(iab.gvl?.specialFeatures ?? {});
	const vendorIds = [
		...Object.keys(iab.gvl?.vendors ?? {}),
		...iab.customVendors.map((vendor) => String(vendor.id)),
	];
	kernel.set.iab({
		purposeConsents: buildFlags(purposeIds, value),
		specialFeatureOptIns: buildFlags(featureIds, value),
		vendorConsents: buildFlags(vendorIds, value),
	});
	return true;
};

/**
 * Creates a panel renderer with shared logic for rendering DevTools panels
 */
export const createPanelRenderer = function createPanelRenderer(
	config: PanelRendererConfig
): PanelRenderer {
	const {
		storeConnector,
		stateManager,
		scriptRegistry,
		namespace,
		enableEventLogging = true,
		onPersistOverrides,
		onClearPersistedOverrides,
		onCopyState,
		onExportDebugBundle,
	} = config;

	/**
	 * Consent toggles the user flipped in the Consents panel but has not
	 * saved yet. The kernel has no notion of a pending selection, so the
	 * devtools hold the draft until Save / Accept / Reject / Reset.
	 */
	const draftConsents = new Map<string, boolean>();

	const getStoreState = (): ConsentSnapshot | null => storeConnector.getState();

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
			stateManager.addEvent({ data, message, type });
		}
	};

	const runCommand = (
		run: () => Promise<unknown>,
		successMessage: string,
		failureMessage: string,
		type: 'consent_save' | 'info' | 'iab' = 'info'
	): void => {
		void (async () => {
			try {
				await run();
				logEvent(type, successMessage);
			} catch (error) {
				logEvent('error', `${failureMessage}: ${String(error)}`);
			}
		})();
	};

	const resetConsents = async (): Promise<void> => {
		const kernel = storeConnector.getKernel();
		if (kernel) {
			draftConsents.clear();
			await resetAllConsents(
				kernel,
				enableEventLogging ? stateManager : undefined
			);
		}
	};

	const applyOverrides = async (
		kernel: ConsentKernel,
		overrides: PersistedDevToolsOverrides
	): Promise<void> => {
		kernel.set.overrides({
			country: overrides.country,
			gpc: overrides.gpc,
			language: overrides.language,
			region: overrides.region,
		});
		await kernel.commands.init();
	};

	const renderPanel = (container: HTMLElement, tab: DevToolsTab): void => {
		// oxlint-disable-next-line default-case -- Preserve established branch order and control flow.
		switch (tab) {
			case 'consents':
				renderConsentsPanel(container, {
					getDraftConsents: () => Object.fromEntries(draftConsents),
					getState: getStoreState,
					onAcceptAll: () => {
						const kernel = storeConnector.getKernel();
						if (kernel) {
							draftConsents.clear();
							runCommand(
								() => kernel.commands.save('all'),
								'Accepted all consents',
								'Failed to accept all consents',
								'consent_save'
							);
						}
					},
					onConsentChange: (name, value) => {
						if (!storeConnector.getKernel()) {
							return;
						}
						draftConsents.set(name, value);
						logEvent('info', `${name} toggled to ${value} (not saved)`, {
							name,
							value,
						});
					},
					onRejectAll: () => {
						const kernel = storeConnector.getKernel();
						if (kernel) {
							draftConsents.clear();
							runCommand(
								() => kernel.commands.save('none'),
								'Rejected all optional consents',
								'Failed to reject optional consents',
								'consent_save'
							);
						}
					},
					onReset: resetConsents,
					onSave: () => {
						const kernel = storeConnector.getKernel();
						if (kernel) {
							const draft = Object.fromEntries(
								draftConsents
							) as Partial<ConsentState>;
							draftConsents.clear();
							runCommand(
								() => kernel.commands.save(draft),
								'Saved consent preferences',
								'Failed to save consent preferences',
								'consent_save'
							);
						}
					},
				});
				break;

			case 'location':
				renderLocationPanel(container, {
					getState: getStoreState,
					onApplyOverrides: async (overrides) => {
						const kernel = storeConnector.getKernel();
						if (kernel) {
							await applyOverrides(kernel, overrides);
							logEvent('info', 'Overrides updated', {
								country: overrides.country,
								gpc: overrides.gpc,
								language: overrides.language,
								region: overrides.region,
							});
							onPersistOverrides?.({
								country: overrides.country,
								gpc: overrides.gpc,
								language: overrides.language,
								region: overrides.region,
							});
						}
					},
					onClearOverrides: async () => {
						const kernel = storeConnector.getKernel();
						if (kernel) {
							await applyOverrides(kernel, {});
							logEvent('info', 'Overrides cleared');
							onClearPersistedOverrides?.();
						}
					},
				});
				break;

			case 'policy':
				renderPolicyPanel(container, {
					getState: getStoreState,
				});
				break;

			case 'scripts':
				renderScriptsPanel(container, {
					getEvents: () => stateManager.getState().eventLog,
					getManagedScripts: () => scriptRegistry.getManagedScripts(),
					getScripts: () => scriptRegistry.getScripts(),
					getState: getStoreState,
				});
				break;

			case 'iab':
				renderIabPanel(container, {
					getState: getStoreState,
					onAcceptAll: () => {
						const kernel = storeConnector.getKernel();
						if (kernel && setAllIabConsents(kernel, true)) {
							logEvent('iab', 'IAB accept all selected');
						}
					},
					onRejectAll: () => {
						const kernel = storeConnector.getKernel();
						if (kernel && setAllIabConsents(kernel, false)) {
							logEvent('iab', 'IAB reject all selected');
						}
					},
					onReset: resetConsents,
					onSave: () => {
						const kernel = storeConnector.getKernel();
						if (!kernel || !readIab(kernel)) {
							return;
						}
						// The TC string is encoded by the `@c15t/iab` module bound to
						// the kernel; this saves the vendor/purpose flags as they are.
						runCommand(
							() => kernel.commands.save(),
							'IAB preferences saved',
							'Failed to save IAB preferences',
							'iab'
						);
					},
					onSetPurposeConsent: (purposeId, value) => {
						const kernel = storeConnector.getKernel();
						const iab = kernel ? readIab(kernel) : null;
						if (!kernel || !iab) {
							return;
						}
						kernel.set.iab({
							purposeConsents: { ...iab.purposeConsents, [purposeId]: value },
						});
						logEvent('iab', `IAB purpose ${purposeId} set to ${value}`);
					},
					onSetSpecialFeatureOptIn: (featureId, value) => {
						const kernel = storeConnector.getKernel();
						const iab = kernel ? readIab(kernel) : null;
						if (!kernel || !iab) {
							return;
						}
						kernel.set.iab({
							specialFeatureOptIns: {
								...iab.specialFeatureOptIns,
								[featureId]: value,
							},
						});
						logEvent('iab', `IAB feature ${featureId} set to ${value}`);
					},
					onSetVendorConsent: (vendorId, value) => {
						const kernel = storeConnector.getKernel();
						const iab = kernel ? readIab(kernel) : null;
						if (!kernel || !iab) {
							return;
						}
						kernel.set.iab({
							vendorConsents: {
								...iab.vendorConsents,
								[String(vendorId)]: value,
							},
						});
						logEvent('iab', `IAB vendor ${vendorId} set to ${value}`);
					},
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
					namespace,
					onCopyState: () => {
						const state = getStoreState();
						if (state) {
							if (onCopyState) {
								const result = onCopyState(state);
								if (result instanceof Promise) {
									void (async () => {
										try {
											const ok = await result;
											logEvent(
												ok ? 'info' : 'error',
												ok
													? 'State copied to clipboard'
													: 'Failed to copy state'
											);
										} catch {
											logEvent('error', 'Failed to copy state');
										}
									})();
								} else {
									logEvent(
										result ? 'info' : 'error',
										result
											? 'State copied to clipboard'
											: 'Failed to copy state'
									);
								}
							} else {
								void (async () => {
									try {
										await navigator.clipboard.writeText(
											JSON.stringify(state, null, 2)
										);
										logEvent('info', 'State copied to clipboard');
									} catch {
										logEvent('error', 'Failed to copy state');
									}
								})();
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
					onOpenPreferences: () => {
						const kernel = storeConnector.getKernel();
						if (kernel) {
							kernel.set.activeUI('dialog');
							logEvent('info', 'Preferences dialog opened');
						}
					},
					onRefetchBanner: async () => {
						const kernel = storeConnector.getKernel();
						if (kernel) {
							await kernel.commands.init();
							logEvent('info', 'Init re-run');
						}
					},
					onResetConsents: resetConsents,
					onShowBanner: () => {
						const kernel = storeConnector.getKernel();
						if (kernel) {
							kernel.set.activeUI('banner');
							logEvent('info', 'Banner shown');
						}
					},
				});
				break;
		}
	};

	return {
		getStoreState,
		renderPanel,
		resetConsents,
	};
};
