import {
  type ComplianceRegion,
  configureConsentManager,
  createConsentManagerStore,
  type PrivacyConsentState,
} from 'c15t';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
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
 * @public
 */
export function ConsentManagerProvider({
	children,
	options,
}: ConsentManagerProviderProps) {
	// Extract and memoise stable options
	const {
		mode,
		backendURL,
		store = {},
		translations,
		ui = {},
	} = options;

	const { initialGdprTypes, initialComplianceSettings } = store;
	const {
		theme,
		disableAnimation = false,
		scrollLock = false,
		trapFocus = true,
		colorScheme,
		noStyle = false,
	} = ui;

	const isConsentDomain = (() => {
		// Safe check for browser environment
		const isBrowser =
			typeof window !== 'undefined' && typeof window.location !== 'undefined';

		if (!isBrowser) {
			// For client-side, use a configuration-based check
			return mode === 'c15t' || mode === 'offline';
		}

		return (
			(mode === 'c15t' || mode === 'offline') &&
			(backendURL?.includes('c15t.dev') ||
				backendURL?.includes('c15t.cloud') ||
				window.location.hostname.includes('c15t.dev') ||
				window.location.hostname.includes('c15t.cloud'))
		);
	})();

	// Generate cache key for manager and store persistence
	const cacheKey = generateCacheKey(
		mode || 'c15t',
		backendURL || '/api/c15t',
		'endpointHandlers' in options ? options.endpointHandlers : undefined
	);

	// Get or create consent manager with caching
	const consentManager = useMemo(() => {
		const cachedManager = managerCache.get(cacheKey);
		if (cachedManager) return cachedManager;

		let newManager: ReturnType<typeof configureConsentManager>;
		if (mode === 'offline') {
			newManager = configureConsentManager({
				mode: 'offline',
				store,
			});
		} else if (mode === 'custom' && 'endpointHandlers' in options) {
			newManager = configureConsentManager({
				mode: 'custom',
				endpointHandlers: options.endpointHandlers,
				store,
			});
		} else {
			newManager = configureConsentManager({
				mode: 'c15t',
				backendURL: backendURL || '/api/c15t',
				store,
			});
		}

		managerCache.set(cacheKey, newManager);
		return newManager;
	}, [cacheKey, mode, backendURL, store, options]);

	// Get or create consent store with caching
	const consentStore = useMemo(() => {
		const cachedStore = storeCache.get(cacheKey);
		if (cachedStore) return cachedStore;

		const newStore = createConsentManagerStore(consentManager, {
			unstable_googleTagManager: options.unstable_googleTagManager,
			config: {
				pkg: '@c15t/preact',
				version: version,
				mode: mode || 'Unknown',
			},
			ignoreGeoLocation: options.ignoreGeoLocation,
			initialGdprTypes: options.consentCategories,
			callbacks: options.callbacks,
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
		options.callbacks,
		store,
		isConsentDomain,
		translations,
	]);

	// Store initial configuration values to avoid reinitialising when options change
	const initialConfigRef = useRef({
		gdprTypes: initialGdprTypes,
		complianceSettings: initialComplianceSettings,
		consentCategories: options.consentCategories,
	});

	// Initial state from the consent manager store
	const [state, setState] = useState<PrivacyConsentState>(() => {
		if (!consentStore) return {} as PrivacyConsentState;
		return consentStore.getState();
	});

	// Subscribe to store changes
	useEffect(() => {
		if (!consentStore) return;
		const unsubscribe = consentStore.subscribe(setState);
		return unsubscribe;
	}, [consentStore]);

	// One-time initialisation per store instance
	useEffect(() => {
		if (!consentStore) return;

		const { setGdprTypes, setComplianceSetting } = consentStore.getState();
		const config = initialConfigRef.current;

		if (config.gdprTypes || config.consentCategories) {
			setGdprTypes(config.gdprTypes || config.consentCategories || []);
		}

		if (config.complianceSettings) {
			for (const [region, settings] of Object.entries(
				config.complianceSettings
			)) {
				setComplianceSetting(region as ComplianceRegion, settings);
			}
		}

		setState(consentStore.getState());
	}, [consentStore]);

	// Theme context value
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

	// Consent context value
	const consentContextValue = useMemo<ConsentStateContextValue>(() => {
		if (!consentStore) {
			throw new Error(
				'Consent store must be initialised before creating context value'
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
