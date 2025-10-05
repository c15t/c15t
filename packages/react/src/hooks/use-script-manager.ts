/**
 * @fileoverview React hooks for script management and consent synchronization.
 * Provides React integration for the core script management and consent sync systems.
 */

import type {
	AnalyticsConsent,
	ConsentChangeEvent,
	ConsentSync,
	ConsentSyncOptions,
	Script,
	ScriptManager,
	ScriptManagerOptions,
} from 'c15t';
import { createConsentSync, createScriptManager } from 'c15t';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Hook for managing consent synchronization
 */
export interface UseConsentSyncOptions extends ConsentSyncOptions {
	/** Initial consent state */
	initialConsent?: AnalyticsConsent;
	/** Callback for consent changes */
	onConsentChange?: (change: ConsentChangeEvent) => void;
}

export interface UseConsentSyncReturn {
	/** Current consent state */
	consent: AnalyticsConsent;
	/** Loading state */
	loading: boolean;
	/** Error state */
	error?: string;
	/** Last updated timestamp */
	lastUpdated: number;
	/** Change source */
	source: string;
	/** Tab ID */
	tabId: string;
	/** Statistics */
	stats: any;
	/** Update consent */
	updateConsent: (
		consent: AnalyticsConsent,
		source?: string,
		reason?: string
	) => Promise<void>;
	/** Reset consent */
	resetConsent: () => Promise<void>;
	/** Get change history */
	getChangeHistory: () => ConsentChangeEvent[];
	/** Get consent statistics */
	getConsentStats: () => any;
}

export function useConsentSync(
	options: UseConsentSyncOptions = {}
): UseConsentSyncReturn {
	const {
		initialConsent = {
			necessary: true,
			measurement: false,
			marketing: false,
			functionality: false,
			experience: false,
		},
		onConsentChange,
		...syncOptions
	} = options;

	const consentSyncRef = useRef<ConsentSync>();
	const [consent, setConsent] = useState<AnalyticsConsent>(initialConsent);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | undefined>();
	const [lastUpdated, setLastUpdated] = useState(Date.now());
	const [source, setSource] = useState('initialization');
	const [tabId, setTabId] = useState('');
	const [stats, setStats] = useState<any>({});

	// Initialize consent sync
	useEffect(() => {
		const consentSync = createConsentSync(
			initialConsent,
			syncOptions,
			(change) => {
				setConsent(change.newConsent);
				setLastUpdated(change.timestamp);
				setSource(change.source);
				setStats(consentSync.getConsentStats());
				onConsentChange?.(change);
			}
		);

		consentSyncRef.current = consentSync;
		setConsent(consentSync.consent);
		setLastUpdated(consentSync.lastUpdated);
		setSource(consentSync.source);
		setTabId(consentSync.tabId);
		setStats(consentSync.getConsentStats());

		return () => {
			consentSync.cleanup();
		};
	}, []);

	// Update consent
	const updateConsent = useCallback(
		async (
			newConsent: AnalyticsConsent,
			changeSource = 'user-action',
			reason?: string
		) => {
			if (!consentSyncRef.current) return;

			setLoading(true);
			setError(undefined);

			try {
				await consentSyncRef.current.updateConsent(
					newConsent,
					changeSource,
					reason
				);
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : String(err);
				setError(errorMessage);
				throw err;
			} finally {
				setLoading(false);
			}
		},
		[]
	);

	// Reset consent
	const resetConsent = useCallback(async () => {
		if (!consentSyncRef.current) return;

		setLoading(true);
		setError(undefined);

		try {
			await consentSyncRef.current.resetConsent();
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : String(err);
			setError(errorMessage);
			throw err;
		} finally {
			setLoading(false);
		}
	}, []);

	// Get change history
	const getChangeHistory = useCallback(() => {
		return consentSyncRef.current?.getChangeHistory() || [];
	}, []);

	// Get consent statistics
	const getConsentStats = useCallback(() => {
		return consentSyncRef.current?.getConsentStats() || {};
	}, []);

	return {
		consent,
		loading,
		error,
		lastUpdated,
		source,
		tabId,
		stats,
		updateConsent,
		resetConsent,
		getChangeHistory,
		getConsentStats,
	};
}

/**
 * Hook for managing analytics scripts
 */
export interface UseScriptManagerOptions extends ScriptManagerOptions {
	/** Callback for script load */
	onScriptLoad?: (script: any) => void;
	/** Callback for script error */
	onScriptError?: (error: Error) => void;
}

export interface UseScriptManagerReturn {
	/** Loaded scripts map */
	scripts: Map<string, any>;
	/** Loading state */
	loading: boolean;
	/** Error state */
	error?: string;
	/** Statistics */
	stats: any;
	/** Load scripts */
	loadScripts: (scripts: Script[]) => Promise<any[]>;
	/** Unload scripts by consent */
	unloadScriptsByConsent: (consent: AnalyticsConsent) => void;
	/** Reload scripts */
	reloadScripts: (scripts: Script[]) => Promise<any[]>;
	/** Clear all scripts */
	clearAllScripts: () => void;
	/** Clear cache */
	clearCache: () => void;
	/** Retry failed scripts */
	retryFailedScripts: () => Promise<any[]>;
	/** Preload scripts */
	preloadScripts: (scripts: Script[]) => Promise<void>;
	/** Get script status */
	getScriptStatus: (scriptId: string) => any;
	/** Check if script is loaded */
	isScriptLoaded: (scriptId: string) => boolean;
	/** Get scripts by consent */
	getScriptsByConsent: (consent: AnalyticsConsent) => Script[];
}

export function useScriptManager(
	options: UseScriptManagerOptions = {}
): UseScriptManagerReturn {
	const { onScriptLoad, onScriptError, ...scriptManagerOptions } = options;

	const scriptManagerRef = useRef<ScriptManager>();
	const [scripts, setScripts] = useState<Map<string, any>>(new Map());
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | undefined>();
	const [stats, setStats] = useState<any>({});

	// Initialize script manager
	useEffect(() => {
		const scriptManager = createScriptManager(scriptManagerOptions);
		scriptManagerRef.current = scriptManager;

		// Update state when scripts change
		const updateState = () => {
			setScripts(new Map(scriptManager.loadedScripts));
			setStats(scriptManager.stats);
		};

		// Set up periodic updates
		const interval = setInterval(updateState, 1000);

		return () => {
			clearInterval(interval);
			scriptManager.clearAllScripts();
		};
	}, []);

	// Load scripts
	const loadScripts = useCallback(
		async (scriptsToLoad: Script[]) => {
			if (!scriptManagerRef.current) return [];

			setLoading(true);
			setError(undefined);

			try {
				const loadedScripts =
					await scriptManagerRef.current.loadScripts(scriptsToLoad);
				setScripts(new Map(scriptManagerRef.current.loadedScripts));
				setStats(scriptManagerRef.current.stats);

				// Notify callback
				loadedScripts.forEach((script) => onScriptLoad?.(script));

				return loadedScripts;
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : String(err);
				setError(errorMessage);
				onScriptError?.(err instanceof Error ? err : new Error(errorMessage));
				throw err;
			} finally {
				setLoading(false);
			}
		},
		[onScriptLoad, onScriptError]
	);

	// Unload scripts by consent
	const unloadScriptsByConsent = useCallback((consent: AnalyticsConsent) => {
		if (!scriptManagerRef.current) return;

		scriptManagerRef.current.unloadScriptsByConsent(consent);
		setScripts(new Map(scriptManagerRef.current.loadedScripts));
		setStats(scriptManagerRef.current.stats);
	}, []);

	// Reload scripts
	const reloadScripts = useCallback(
		async (scriptsToReload: Script[]) => {
			if (!scriptManagerRef.current) return [];

			setLoading(true);
			setError(undefined);

			try {
				const loadedScripts =
					await scriptManagerRef.current.reloadScripts(scriptsToReload);
				setScripts(new Map(scriptManagerRef.current.loadedScripts));
				setStats(scriptManagerRef.current.stats);
				return loadedScripts;
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : String(err);
				setError(errorMessage);
				onScriptError?.(err instanceof Error ? err : new Error(errorMessage));
				throw err;
			} finally {
				setLoading(false);
			}
		},
		[onScriptError]
	);

	// Clear all scripts
	const clearAllScripts = useCallback(() => {
		if (!scriptManagerRef.current) return;

		scriptManagerRef.current.clearAllScripts();
		setScripts(new Map());
		setStats(scriptManagerRef.current.stats);
	}, []);

	// Clear cache
	const clearCache = useCallback(() => {
		if (!scriptManagerRef.current) return;

		scriptManagerRef.current.clearCache();
	}, []);

	// Retry failed scripts
	const retryFailedScripts = useCallback(async () => {
		if (!scriptManagerRef.current) return [];

		setLoading(true);
		setError(undefined);

		try {
			const loadedScripts = await scriptManagerRef.current.retryFailedScripts();
			setScripts(new Map(scriptManagerRef.current.loadedScripts));
			setStats(scriptManagerRef.current.stats);
			return loadedScripts;
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : String(err);
			setError(errorMessage);
			onScriptError?.(err instanceof Error ? err : new Error(errorMessage));
			throw err;
		} finally {
			setLoading(false);
		}
	}, [onScriptError]);

	// Preload scripts
	const preloadScripts = useCallback(
		async (scriptsToPreload: Script[]) => {
			if (!scriptManagerRef.current) return;

			try {
				await scriptManagerRef.current.preloadScripts(scriptsToPreload);
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : String(err);
				setError(errorMessage);
				onScriptError?.(err instanceof Error ? err : new Error(errorMessage));
			}
		},
		[onScriptError]
	);

	// Get script status
	const getScriptStatus = useCallback((scriptId: string) => {
		return scriptManagerRef.current?.getScriptStatus(scriptId) || null;
	}, []);

	// Check if script is loaded
	const isScriptLoaded = useCallback((scriptId: string) => {
		return scriptManagerRef.current?.isScriptLoaded(scriptId) || false;
	}, []);

	// Get scripts by consent
	const getScriptsByConsent = useCallback((consent: AnalyticsConsent) => {
		return scriptManagerRef.current?.getScriptsByConsent(consent) || [];
	}, []);

	return {
		scripts,
		loading,
		error,
		stats,
		loadScripts,
		unloadScriptsByConsent,
		reloadScripts,
		clearAllScripts,
		clearCache,
		retryFailedScripts,
		preloadScripts,
		getScriptStatus,
		isScriptLoaded,
		getScriptsByConsent,
	};
}
