'use client';

import {
	type ConsentStoreState,
	configureConsentManager,
	createConsentManagerStore,
	type StorageConfig,
} from 'c15t';
import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import {
	ConsentStateContext,
	type ConsentStateContextValue,
} from '../context/consent-manager-context';
import { GlobalThemeContext } from '../context/theme-context';
import { useColorScheme } from '../hooks/use-color-scheme';
import type { ConsentManagerProviderProps } from '../types/consent-manager';
import { defaultTheme, generateThemeCSS } from '../utils/theme-utils';
import { version } from '../version';

/**
 * Deep merges two objects recursively
 */
function deepMerge<T extends Record<string, any>>(target: T, source: any): T {
	if (!source || typeof source !== 'object') return target;
	const result = { ...target } as any;
	for (const key in source) {
		if (
			source[key] &&
			typeof source[key] === 'object' &&
			!Array.isArray(source[key])
		) {
			result[key] = deepMerge(result[key] || {}, source[key]);
		} else {
			result[key] = source[key];
		}
	}
	return result as T;
}

// Module-level cache to persist stores across component unmounts/remounts
const storeCache = new Map<
	string,
	ReturnType<typeof createConsentManagerStore>
>();
const managerCache = new Map<
	string,
	ReturnType<typeof configureConsentManager>
>();

/**
 * Clears all cached consent managers and stores.
 *
 * @remarks
 * This utility function is primarily intended for use in tests to ensure
 * clean state between test cases. The module-level caches persist across
 * component unmounts/remounts, which can cause test interference.
 *
 * @internal
 */
export function clearConsentManagerCache(): void {
	storeCache.clear();
	managerCache.clear();
}

interface CacheKeyOptions {
	mode: string;
	backendURL: string | undefined;
	endpointHandlers: unknown;
	storageConfig: StorageConfig | undefined;
	defaultLanguage: string | undefined;
	enabled: boolean | undefined;
}
// Generate a cache key based on critical configuration options

function generateCacheKey({
	mode,
	backendURL,
	endpointHandlers,
	storageConfig,
	defaultLanguage,
	enabled,
}: CacheKeyOptions): string {
	const enabledKey = enabled === false ? 'disabled' : 'enabled';
	return `${mode}:${backendURL ?? 'default'}:${endpointHandlers ? 'custom' : 'none'}:${storageConfig?.storageKey ?? 'default'}:${defaultLanguage ?? 'default'}:${enabledKey}`;
}

/**
 * Provider component for consent management functionality.
 *
 * @remarks
 * This component initializes and manages the consent management system, including:
 * - Setting up the consent store with initial configuration
 * - Creating a consent manager from the provided options
 * - Detecting user's region for compliance
 * - Managing consent state updates
 * - Providing access to consent management throughout the app
 *
 * @example
 * ```tsx
 * <ConsentManagerProvider
 *   options={{
 *     mode: 'offline',
 *     callbacks: {
 *       onConsentSet: (response) => console.log('Consent updated')
 *     }
 *   }}
 * >
 *   {children}
 * </ConsentManagerProvider>
 * ```
 *
 * @public
 */
export function ConsentManagerProvider({
	children,
	options,
}: ConsentManagerProviderProps) {
	// Extract and memoize stable options
	const { mode, backendURL, store } = options;

	// Normalize store options so that initial translations are always available
	// to both the core store and the underlying client (including offline).
	const normalizedStoreOptions = useMemo(
		() => ({
			...store,
			initialTranslationConfig: options.translations,
		}),
		[store, options.translations]
	);

	// Generate cache key for manager and store persistence
	const cacheKey = generateCacheKey({
		mode: mode || 'c15t',
		backendURL: backendURL || '/api/c15t',
		endpointHandlers:
			'endpointHandlers' in options ? options.endpointHandlers : undefined,
		storageConfig: options.storageConfig,
		defaultLanguage: options.translations?.defaultLanguage,
		enabled: options.enabled,
	});

	// Get or create consent manager with caching
	const consentManager = useMemo(() => {
		const cachedManager = managerCache.get(cacheKey);

		if (cachedManager) {
			return cachedManager;
		}

		let newManager: ReturnType<typeof configureConsentManager>;
		if (mode === 'offline') {
			newManager = configureConsentManager({
				mode: 'offline',
				store: normalizedStoreOptions,
				storageConfig: options.storageConfig,
			});
		} else if (mode === 'custom' && 'endpointHandlers' in options) {
			newManager = configureConsentManager({
				mode: 'custom',
				endpointHandlers: options.endpointHandlers,
				store: normalizedStoreOptions,
				storageConfig: options.storageConfig,
			});
		} else {
			newManager = configureConsentManager({
				mode: 'c15t',
				backendURL: backendURL || '/api/c15t',
				store: normalizedStoreOptions,
				storageConfig: options.storageConfig,
			});
		}

		managerCache.set(cacheKey, newManager);
		return newManager;
	}, [cacheKey, mode, backendURL, normalizedStoreOptions, options]);

	// Get or create consent store with caching
	const consentStore = useMemo(() => {
		const cachedStore = storeCache.get(cacheKey);

		if (cachedStore) {
			return cachedStore;
		}

		const newStore = createConsentManagerStore(consentManager, {
			config: {
				pkg: '@c15t/react',
				version: version,
				mode: mode || 'Unknown',
			},
			...options,
			...normalizedStoreOptions,
		});

		storeCache.set(cacheKey, newStore);
		return newStore;
	}, [cacheKey, consentManager, mode, options, normalizedStoreOptions]);

	// Initialize state with the current state from the consent manager store
	const [state, setState] = useState<ConsentStoreState>(() => {
		if (!consentStore) {
			return {} as ConsentStoreState;
		}

		return consentStore.getState();
	});

	// Track if we've initialized to avoid redundant state updates during hydration
	const initializedRef = useRef(false);

	// Set up subscription immediately and separately from initialization
	useEffect(() => {
		if (!consentStore) {
			return;
		}

		// Set up subscription FIRST to catch all state changes
		const unsubscribe = consentStore.subscribe(setState);

		// Sync state only if it has changed (to avoid unnecessary re-renders during hydration)
		// Use startTransition to make this update non-blocking and prevent hydration flash
		if (!initializedRef.current) {
			const currentStoreState = consentStore.getState();
			startTransition(() => {
				setState((prevState) => {
					// Only update if state reference has actually changed
					if (prevState !== currentStoreState) {
						initializedRef.current = true;
						return currentStoreState;
					}
					initializedRef.current = true;
					return prevState;
				});
			});
		}

		return unsubscribe;
	}, [consentStore]);

	// Create theme context value
	const themeContextValue = useMemo(() => {
		const {
			theme = {},
			noStyle,
			disableAnimation,
			trapFocus = true,
			colorScheme,
		} = options;

		const mergedTheme = deepMerge(defaultTheme, theme);

		return {
			theme: mergedTheme,
			noStyle,
			disableAnimation,
			trapFocus,
			colorScheme,
		};
	}, [options]);

	// Generate CSS variables for the theme
	const themeCSS = useMemo(() => {
		return generateThemeCSS(themeContextValue.theme);
	}, [themeContextValue.theme]);

	useColorScheme(options.colorScheme);

	// Create consent context value - without theme properties
	const consentContextValue = useMemo<ConsentStateContextValue>(() => {
		if (!consentStore) {
			throw new Error(
				'Consent store must be initialized before creating context value'
			);
		}
		return {
			state,
			store: consentStore,
			manager: consentManager,
		};
	}, [state, consentStore, consentManager]);

	return (
		<ConsentStateContext.Provider value={consentContextValue}>
			<GlobalThemeContext.Provider value={themeContextValue}>
				{themeCSS && (
					<style
						id="c15t-theme-v2"
						dangerouslySetInnerHTML={{ __html: themeCSS }}
					/>
				)}
				{children}
			</GlobalThemeContext.Provider>
		</ConsentStateContext.Provider>
	);
}
