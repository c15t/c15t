'use client';

import {
	type ComplianceRegion,
	type PrivacyConsentState,
	configureConsentManager,
	createConsentManagerStore,
} from 'c15t';
import { useEffect, useMemo, useState } from 'react';
import packageJson from '../../package.json';
import {
	ConsentStateContext,
	type ConsentStateContextValue,
} from '../context/consent-manager-context';
import { GlobalThemeContext } from '../context/theme-context';
import { useColorScheme } from '../hooks/use-color-scheme';
import type { ConsentManagerProviderProps } from '../types/consent-manager';

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

// Generate a cache key based on critical configuration options
function generateCacheKey(
	mode: string,
	backendURL: string | undefined,
	endpointHandlers: unknown
): string {
	return `${mode}:${backendURL ?? 'default'}:${endpointHandlers ? 'custom' : 'none'}`;
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
	const {
		mode,
		backendURL,
		callbacks,
		store = {},
		translations,
		react = {},
	} = options;

	// Destructure once to avoid redundant access
	const { initialGdprTypes, initialComplianceSettings } = store;
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
	const cacheKey = generateCacheKey(
		mode || 'c15t',
		backendURL || '/api/c15t',
		'endpointHandlers' in options ? options.endpointHandlers : undefined
	);

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
				callbacks,
				store,
			});
		} else if (mode === 'custom' && 'endpointHandlers' in options) {
			newManager = configureConsentManager({
				mode: 'custom',
				endpointHandlers: options.endpointHandlers,
				callbacks,
				store,
			});
		} else {
			newManager = configureConsentManager({
				mode: 'c15t',
				backendURL: backendURL || '/api/c15t',
				callbacks,
				store,
			});
		}

		managerCache.set(cacheKey, newManager);
		return newManager;
	}, [cacheKey, mode, backendURL, callbacks, store, options]);

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
				version: packageJson.version,
				mode: mode || 'Unknown',
			},
			ignoreGeoLocation: options.ignoreGeoLocation,
			initialGdprTypes: options.consentCategories,
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
		options.unstable_googleTagManager,
		options.ignoreGeoLocation,
		options.consentCategories,
		store,
		isConsentDomain,
		translations,
	]);

	// Initialize state with the current state from the consent manager store
	const [state, setState] = useState<PrivacyConsentState>(() => {
		if (!consentStore) {
			return {} as PrivacyConsentState;
		}

		return consentStore.getState();
	});

	// Initialize the store with settings and set up subscription
	useEffect(() => {
		if (!consentStore) {
			return;
		}

		const { setGdprTypes, setComplianceSetting } = consentStore.getState();

		// Initialize GDPR types if provided
		if (initialGdprTypes || options.consentCategories) {
			setGdprTypes(initialGdprTypes || options.consentCategories || []);
		}

		// Initialize compliance settings if provided
		if (initialComplianceSettings) {
			for (const [region, settings] of Object.entries(
				initialComplianceSettings
			)) {
				setComplianceSetting(region as ComplianceRegion, settings);
			}
		}

		// Subscribe to state changes only once
		const unsubscribe = consentStore.subscribe(setState);

		return unsubscribe;
	}, [
		consentStore,
		initialGdprTypes,
		initialComplianceSettings,
		options.consentCategories,
	]);

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
