/**
 * @fileoverview Analytics hook that integrates with the existing consent manager.
 * Provides analytics functionality with script management and consent synchronization.
 */

import type { AnalyticsConsent, Script } from 'c15t';
import { useCallback, useContext } from 'react';
import { ConsentStateContext } from '../context/consent-manager-context';

/**
 * Options for useAnalytics hook
 */
export interface UseAnalyticsOptions {
	/** Enable script management */
	enableScriptManagement?: boolean;
	/** Enable consent synchronization */
	enableConsentSync?: boolean;
	/** Callback for script load */
	onScriptLoad?: (script: any) => void;
	/** Callback for script error */
	onScriptError?: (error: Error) => void;
}

/**
 * Return type for useAnalytics hook
 */
export interface UseAnalyticsReturn {
	/** Current consent state */
	consent: AnalyticsConsent;
	/** Loaded scripts map */
	scripts: Map<string, any>;
	/** Loading state */
	loading: boolean;
	/** Error state */
	error?: string;
	/** Statistics */
	stats: any;
	/** Track event */
	track: (event: string, properties?: any) => Promise<void>;
	/** Page event */
	page: (name: string, properties?: any) => Promise<void>;
	/** Identify user */
	identify: (userId: string, traits?: any) => Promise<void>;
	/** Group user */
	group: (groupId: string, traits?: any) => Promise<void>;
	/** Alias user */
	alias: (userId: string, previousId?: string) => Promise<void>;
	/** Update consent */
	updateConsent: (
		consent: AnalyticsConsent,
		source?: string,
		reason?: string
	) => Promise<void>;
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

/**
 * Hook for analytics functionality with script management and consent synchronization
 */
export function useAnalytics(
	options: UseAnalyticsOptions = {}
): UseAnalyticsReturn {
	const { onScriptLoad, onScriptError } = options;

	const context = useContext(ConsentStateContext);
	if (!context) {
		throw new Error(
			'useAnalytics must be used within a ConsentManagerProvider'
		);
	}

	const { analytics, scriptManager, consentSync } = context;

	// Get consent from consent sync or fallback to analytics state
	const consent: AnalyticsConsent = consentSync?.consent || {
		necessary: true,
		measurement: false,
		marketing: false,
		functionality: false,
		experience: false,
	};

	// Track event
	const track = useCallback(
		async (event: string, properties?: any) => {
			try {
				await analytics.track({
					name: event,
					properties: properties || {},
				});
			} catch (error) {
				console.error('Failed to track event', error);
			}
		},
		[analytics]
	);

	// Page event
	const page = useCallback(
		async (name: string, properties?: any) => {
			try {
				await analytics.page({
					name,
					properties: properties || {},
				});
			} catch (error) {
				console.error('Failed to track page', error);
			}
		},
		[analytics]
	);

	// Identify user
	const identify = useCallback(
		async (userId: string, traits?: any) => {
			try {
				await analytics.identify({
					userId,
					traits: traits || {},
				});
			} catch (error) {
				console.error('Failed to identify user', error);
			}
		},
		[analytics]
	);

	// Group user
	const group = useCallback(
		async (groupId: string, traits?: any) => {
			try {
				await analytics.group({
					groupId,
					traits: traits || {},
				});
			} catch (error) {
				console.error('Failed to group user', error);
			}
		},
		[analytics]
	);

	// Alias user
	const alias = useCallback(
		async (userId: string, previousId?: string) => {
			try {
				await analytics.alias({
					previousId,
				});
			} catch (error) {
				console.error('Failed to alias user', error);
			}
		},
		[analytics]
	);

	// Update consent
	const updateConsent = useCallback(
		async (
			newConsent: AnalyticsConsent,
			source = 'user-action',
			reason?: string
		) => {
			if (consentSync) {
				try {
					await consentSync.updateConsent(newConsent, source, reason);
				} catch (error) {
					console.error('Failed to update consent', error);
				}
			}
		},
		[consentSync]
	);

	// Script management functions (with fallbacks if script manager not available)
	const loadScripts = useCallback(
		async (scripts: Script[]) => {
			if (scriptManager) {
				try {
					const loadedScripts = await scriptManager.loadScripts(scripts);
					for (const script of loadedScripts) {
						onScriptLoad?.(script);
					}
					return loadedScripts;
				} catch (error) {
					onScriptError?.(
						error instanceof Error ? error : new Error(String(error))
					);
					throw error;
				}
			}
			return [];
		},
		[scriptManager, onScriptLoad, onScriptError]
	);

	const unloadScriptsByConsent = useCallback(
		(consentToCheck: AnalyticsConsent) => {
			scriptManager?.unloadScriptsByConsent(consentToCheck);
		},
		[scriptManager]
	);

	const reloadScripts = useCallback(
		async (scripts: Script[]) => {
			if (scriptManager) {
				try {
					return await scriptManager.reloadScripts(scripts);
				} catch (error) {
					onScriptError?.(
						error instanceof Error ? error : new Error(String(error))
					);
					throw error;
				}
			}
			return [];
		},
		[scriptManager, onScriptError]
	);

	const clearAllScripts = useCallback(() => {
		scriptManager?.clearAllScripts();
	}, [scriptManager]);

	const clearCache = useCallback(() => {
		scriptManager?.clearCache();
	}, [scriptManager]);

	const retryFailedScripts = useCallback(async () => {
		if (scriptManager) {
			try {
				return await scriptManager.retryFailedScripts();
			} catch (error) {
				onScriptError?.(
					error instanceof Error ? error : new Error(String(error))
				);
				throw error;
			}
		}
		return [];
	}, [scriptManager, onScriptError]);

	const preloadScripts = useCallback(
		async (scripts: Script[]) => {
			if (scriptManager) {
				try {
					await scriptManager.preloadScripts(scripts);
				} catch (error) {
					onScriptError?.(
						error instanceof Error ? error : new Error(String(error))
					);
				}
			}
		},
		[scriptManager, onScriptError]
	);

	const getScriptStatus = useCallback(
		(scriptId: string) => {
			return scriptManager?.getScriptStatus(scriptId) || null;
		},
		[scriptManager]
	);

	const isScriptLoaded = useCallback(
		(scriptId: string) => {
			return scriptManager?.isScriptLoaded(scriptId) || false;
		},
		[scriptManager]
	);

	const getScriptsByConsent = useCallback(
		(consentToCheck: AnalyticsConsent) => {
			return scriptManager?.getScriptsByConsent(consentToCheck) || [];
		},
		[scriptManager]
	);

	return {
		consent,
		scripts: scriptManager?.scripts || new Map(),
		loading: scriptManager?.loading || false,
		error: scriptManager?.error,
		stats: scriptManager?.stats || {},
		track,
		page,
		identify,
		group,
		alias,
		updateConsent,
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

/**
 * Hook for tracking events.
 *
 * @returns Function to track events
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const track = useTrack();
 *
 *   const handleClick = () => {
 *     track({
 *       name: 'button_clicked',
 *       properties: { button: 'cta' }
 *     });
 *   };
 *
 *   return <button onClick={handleClick}>Click me</button>;
 * }
 * ```
 */
export function useTrack() {
	const { track, loading } = useAnalytics();

	return useCallback(
		async (event: string, properties?: any) => {
			if (!loading) {
				await track(event, properties);
			}
		},
		[track, loading]
	);
}

/**
 * Hook for tracking page views.
 *
 * @returns Function to track page views
 *
 * @example
 * ```tsx
 * function MyPage() {
 *   const page = usePage();
 *
 *   useEffect(() => {
 *     page('Homepage', { section: 'hero' });
 *   }, [page]);
 *
 *   return <div>Homepage content</div>;
 * }
 * ```
 */
export function usePage() {
	const { page, loading } = useAnalytics();

	return useCallback(
		async (name: string, properties?: any) => {
			if (!loading) {
				await page(name, properties);
			}
		},
		[page, loading]
	);
}

/**
 * Hook for identifying users.
 *
 * @returns Function to identify users
 *
 * @example
 * ```tsx
 * function LoginForm() {
 *   const identify = useIdentify();
 *
 *   const handleLogin = (user) => {
 *     identify(user.id, {
 *       email: user.email,
 *       name: user.name
 *     });
 *   };
 *
 *   return <form onSubmit={handleLogin}>...</form>;
 * }
 * ```
 */
export function useIdentify() {
	const { identify, loading } = useAnalytics();

	return useCallback(
		async (userId: string, traits?: any) => {
			if (!loading) {
				await identify(userId, traits);
			}
		},
		[identify, loading]
	);
}

/**
 * Hook for grouping users.
 *
 * @returns Function to group users
 *
 * @example
 * ```tsx
 * function OrganizationPage() {
 *   const group = useGroup();
 *
 *   const handleJoinOrg = (orgId) => {
 *     group(orgId, {
 *       name: 'Acme Corp',
 *       plan: 'enterprise'
 *     });
 *   };
 *
 *   return <button onClick={handleJoinOrg}>Join Organization</button>;
 * }
 * ```
 */
export function useGroup() {
	const { group, loading } = useAnalytics();

	return useCallback(
		async (groupId: string, traits?: any) => {
			if (!loading) {
				await group(groupId, traits);
			}
		},
		[group, loading]
	);
}

/**
 * Hook for aliasing users.
 *
 * @returns Function to alias users
 *
 * @example
 * ```tsx
 * function UserMerge() {
 *   const alias = useAlias();
 *
 *   const handleMerge = (newId, oldId) => {
 *     alias(newId, oldId);
 *   };
 *
 *   return <button onClick={() => handleMerge('new123', 'old456')}>Merge Users</button>;
 * }
 * ```
 */
export function useAlias() {
	const { alias, loading } = useAnalytics();

	return useCallback(
		async (userId: string, previousId?: string) => {
			if (!loading) {
				await alias(userId, previousId);
			}
		},
		[alias, loading]
	);
}

/**
 * Hook for common analytics operations.
 *
 * @returns Object with common analytics functions
 *
 * @example
 * ```tsx
 * function AnalyticsPanel() {
 *   const { reset, flush } = useCommon();
 *
 *   return (
 *     <div>
 *       <button onClick={reset}>Reset Analytics</button>
 *       <button onClick={flush}>Flush Events</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useCommon() {
	const analytics = useAnalytics();

	return {
		reset: analytics.clearAllScripts,
		flush: analytics.clearCache,
	};
}

/**
 * Hook for resetting analytics.
 *
 * @returns Function to reset analytics
 */
export function useReset() {
	const { clearAllScripts } = useAnalytics();

	return useCallback(() => {
		clearAllScripts();
	}, [clearAllScripts]);
}

/**
 * Hook for flushing analytics events.
 *
 * @returns Function to flush analytics events
 */
export function useFlush() {
	const { clearCache } = useAnalytics();

	return useCallback(() => {
		clearCache();
	}, [clearCache]);
}

/**
 * Hook for getting analytics state.
 *
 * @returns Current analytics state
 */
export function useAnalyticsState() {
	const { consent, scripts, loading, error, stats } = useAnalytics();

	return {
		consent,
		scripts,
		loading,
		error,
		stats,
	};
}

/**
 * Hook for checking if analytics is loaded.
 *
 * @returns Whether analytics is loaded
 */
export function useIsAnalyticsLoaded() {
	const { loading } = useAnalytics();

	return !loading;
}
