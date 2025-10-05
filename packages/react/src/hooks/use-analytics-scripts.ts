/**
 * @fileoverview Hook for managing analytics scripts with consent integration.
 * Combines script management with consent synchronization for seamless analytics integration.
 */

import type { AnalyticsConsent, Script, ScriptManagerOptions } from 'c15t';
import { useCallback, useEffect } from 'react';
import { useConsentSync, useScriptManager } from './use-script-manager';

/**
 * Options for useAnalyticsScripts hook
 */
export interface UseAnalyticsScriptsOptions extends ScriptManagerOptions {
	/** Enable consent synchronization */
	enableConsentSync?: boolean;
	/** Enable automatic script loading */
	enableAutoLoading?: boolean;
	/** Enable error handling */
	enableErrorHandling?: boolean;
	/** Callback for script load */
	onScriptLoad?: (script: any) => void;
	/** Callback for script error */
	onScriptError?: (error: Error) => void;
}

/**
 * Return type for useAnalyticsScripts hook
 */
export interface UseAnalyticsScriptsReturn {
	/** Loaded scripts map */
	scripts: Map<string, any>;
	/** Loading state */
	loading: boolean;
	/** Error state */
	error?: string;
	/** Current consent state */
	consent: AnalyticsConsent;
	/** Statistics */
	stats: any;
	/** Load scripts */
	loadScripts: (consent: AnalyticsConsent) => Promise<void>;
	/** Unload scripts */
	unloadScripts: (consent: AnalyticsConsent) => Promise<void>;
	/** Reload scripts */
	reloadScripts: () => Promise<void>;
	/** Preload scripts */
	preloadScripts: (consent: AnalyticsConsent) => Promise<void>;
	/** Clear cache */
	clearCache: () => void;
	/** Retry failed scripts */
	retryFailedScripts: () => Promise<void>;
	/** Get script status */
	getScriptStatus: (scriptId: string) => any;
	/** Update consent */
	updateConsent: (
		consent: AnalyticsConsent,
		source?: string,
		reason?: string
	) => Promise<void>;
}

/**
 * Hook for managing analytics scripts with consent integration
 */
export function useAnalyticsScripts(
	options: UseAnalyticsScriptsOptions = {}
): UseAnalyticsScriptsReturn {
	const {
		enableConsentSync = true,
		enableAutoLoading = true,
		enableErrorHandling = true,
		onScriptLoad,
		onScriptError,
		...scriptManagerOptions
	} = options;

	// Use script manager hook
	const scriptManager = useScriptManager({
		...scriptManagerOptions,
		onScriptLoad,
		onScriptError,
	});

	// Use consent sync hook if enabled
	const consentSync = useConsentSync({
		enableCrossTabSync: enableConsentSync,
		onConsentChange: (change) => {
			if (enableAutoLoading) {
				// Load scripts based on new consent
				loadScriptsForConsent(change.newConsent);
			}
		},
	});

	// Handle script loading errors
	useEffect(() => {
		if (enableErrorHandling && scriptManager.error) {
			console.error('Analytics script error', scriptManager.error);

			// Retry failed scripts after a delay
			setTimeout(() => {
				scriptManager.retryFailedScripts();
			}, 5000);
		}
	}, [scriptManager.error, enableErrorHandling]);

	// Auto-load scripts when consent changes
	useEffect(() => {
		if (enableAutoLoading && !scriptManager.loading) {
			loadScriptsForConsent(consentSync.consent);
		}
	}, [consentSync.consent, enableAutoLoading, scriptManager.loading]);

	// Load scripts for specific consent
	const loadScriptsForConsent = useCallback(
		async (consent: AnalyticsConsent) => {
			try {
				// This would typically fetch scripts from the backend based on consent
				// For now, we'll use empty array as placeholder
				const scripts: Script[] = [];
				await scriptManager.loadScripts(scripts);
			} catch (error) {
				console.error('Failed to load scripts for consent', error);
			}
		},
		[scriptManager]
	);

	// Handle consent updates
	const handleUpdateConsent = useCallback(
		async (
			newConsent: AnalyticsConsent,
			source = 'user-action',
			reason?: string
		) => {
			try {
				await consentSync.updateConsent(newConsent, source, reason);

				if (enableAutoLoading) {
					await loadScriptsForConsent(newConsent);
				}
			} catch (error) {
				console.error('Failed to update consent', error);
			}
		},
		[consentSync, enableAutoLoading, loadScriptsForConsent]
	);

	// Load scripts
	const loadScripts = useCallback(
		async (consent: AnalyticsConsent) => {
			await loadScriptsForConsent(consent);
		},
		[loadScriptsForConsent]
	);

	// Unload scripts
	const unloadScripts = useCallback(
		async (consent: AnalyticsConsent) => {
			scriptManager.unloadScriptsByConsent(consent);
		},
		[scriptManager]
	);

	// Reload scripts
	const reloadScripts = useCallback(async () => {
		await scriptManager.reloadScripts([]);
	}, [scriptManager]);

	// Preload scripts
	const preloadScripts = useCallback(
		async (consent: AnalyticsConsent) => {
			// This would typically fetch scripts from the backend for preloading
			const scripts: Script[] = [];
			await scriptManager.preloadScripts(scripts);
		},
		[scriptManager]
	);

	// Clear cache
	const clearCache = useCallback(() => {
		scriptManager.clearCache();
	}, [scriptManager]);

	// Retry failed scripts
	const retryFailedScripts = useCallback(async () => {
		await scriptManager.retryFailedScripts();
	}, [scriptManager]);

	// Get script status
	const getScriptStatus = useCallback(
		(scriptId: string) => {
			return scriptManager.getScriptStatus(scriptId);
		},
		[scriptManager]
	);

	return {
		...scriptManager,
		consent: consentSync.consent,
		updateConsent: handleUpdateConsent,
		loadScripts,
		unloadScripts,
		reloadScripts,
		preloadScripts,
		clearCache,
		retryFailedScripts,
		getScriptStatus,
	};
}
