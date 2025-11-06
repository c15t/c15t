'use client';

import {
	configureConsentManager,
	createConsentManagerStore,
	type PrivacyConsentState,
	type StorageConfig,
} from 'c15t';
import { useEffect, useMemo, useState } from 'react';
import {
	ConsentStateContext,
	type ConsentStateContextValue,
} from '../context/consent-manager-context';
import { GlobalThemeContext } from '../context/theme-context';
import { useColorScheme } from '../hooks/use-color-scheme';
import type { ConsentManagerProviderProps } from '../types/consent-manager';
import { version } from '../version';

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
}
// Generate a cache key based on critical configuration options

function generateCacheKey({
	mode,
	backendURL,
	endpointHandlers,
	storageConfig,
}: CacheKeyOptions): string {
	return `${mode}:${backendURL ?? 'default'}:${endpointHandlers ? 'custom' : 'none'}:${storageConfig?.storageKey ?? 'default'}`;
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
	const { mode, backendURL, store = {}, translations, react = {} } = options;

	// Destructure once to avoid redundant access
	const {
		theme,
		disableAnimation = false,
		scrollLock = false,
		trapFocus = true,
		colorScheme,
		noStyle = false,
	} = react;

	// Determine if using c15t.dev domain (memoize the calculation)
	const isConsentDomain = useMemo(() => {
		if (typeof window === 'undefined') {
			return false;
		}

		return Boolean(
			(mode === 'c15t' || mode === 'offline') &&
				(backendURL?.includes('c15t.dev') ||
					backendURL?.includes('c15t.cloud') ||
					window.location.hostname.includes('c15t.dev') ||
					window.location.hostname.includes('c15t.cloud'))
		);
	}, [mode, backendURL]);

	// Generate cache key for manager and store persistence
	const cacheKey = generateCacheKey({
		mode: mode || 'c15t',
		backendURL: backendURL || '/api/c15t',
		endpointHandlers:
			'endpointHandlers' in options ? options.endpointHandlers : undefined,
		storageConfig: options.storageConfig,
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
				store,
				storageConfig: options.storageConfig,
			});
		} else if (mode === 'custom' && 'endpointHandlers' in options) {
			newManager = configureConsentManager({
				mode: 'custom',
				endpointHandlers: options.endpointHandlers,
				store,
				storageConfig: options.storageConfig,
			});
		} else {
			newManager = configureConsentManager({
				mode: 'c15t',
				backendURL: backendURL || '/api/c15t',
				store,
				storageConfig: options.storageConfig,
			});
		}

		managerCache.set(cacheKey, newManager);
		return newManager;
	}, [cacheKey, mode, backendURL, store, options]);

	// Get or create consent store with caching
	const consentStore = useMemo(() => {
		const cachedStore = storeCache.get(cacheKey);

		if (cachedStore) {
			return cachedStore;
		}

		const newStore = createConsentManagerStore(consentManager, {
			unstable_googleTagManager: options.unstable_googleTagManager,
			config: {
				pkg: '@c15t/react',
				version: version,
				mode: mode || 'Unknown',
			},
			ignoreGeoLocation: options.ignoreGeoLocation,
			initialGdprTypes: options.consentCategories,
			callbacks: options.callbacks,
			trackingBlockerConfig: options.trackingBlockerConfig,
			scripts: options.scripts,
			legalLinks: options.legalLinks,
			storageConfig: options.storageConfig,
			user: options.user,
			...store,
			isConsentDomain,
			initialTranslationConfig: translations,
		});

		storeCache.set(cacheKey, newStore);
		return newStore;
	}, [
		cacheKey,
		consentManager,
		mode,
		options.callbacks,
		options.unstable_googleTagManager,
		options.ignoreGeoLocation,
		options.consentCategories,
		options.trackingBlockerConfig,
		options.scripts,
		options.legalLinks,
		options.user,
		store,
		isConsentDomain,
		translations,
		options.storageConfig,
	]);

	// Initialize state with the current state from the consent manager store
	const [state, setState] = useState<PrivacyConsentState>(() => {
		if (!consentStore) {
			return {} as PrivacyConsentState;
		}

		return consentStore.getState();
	});

	// Set up subscription immediately and separately from initialization
	useEffect(() => {
		if (!consentStore) {
			return;
		}

		// Set up subscription FIRST to catch all state changes
		const unsubscribe = consentStore.subscribe(setState);

		return unsubscribe;
	}, [consentStore]);

	// Initialize the store (only run once per store instance)
	useEffect(() => {
		if (!consentStore) {
			return;
		}

		setState(consentStore.getState());
	}, [consentStore]); // Only depend on consentStore to avoid reinitializing on every option change

	// Create theme context value
	const themeContextValue = useMemo(() => {
		return {
			theme,
			noStyle,
			disableAnimation,
			scrollLock,
			trapFocus,
			colorScheme,
		};
	}, [theme, noStyle, disableAnimation, scrollLock, trapFocus, colorScheme]);

	useColorScheme(colorScheme);

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
				{children}
			</GlobalThemeContext.Provider>
		</ConsentStateContext.Provider>
	);
}
