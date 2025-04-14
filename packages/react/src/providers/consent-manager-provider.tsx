'use client';

import {
	type ComplianceRegion,
	type PrivacyConsentState,
	configureConsentManager,
	createConsentManagerStore,
	defaultTranslationConfig,
} from 'c15t';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ConsentStateContext } from '../context/consent-manager-context';
import { GlobalThemeContext } from '../context/theme-context';
import { useColorScheme } from '../hooks/use-color-scheme';
import type { ConsentManagerProviderProps } from '../types/consent-manager';
import {
	detectBrowserLanguage,
	mergeTranslationConfigs,
} from '../utils/translations';

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
		translations: translationConfig,
		react = {},
	} = options;

	// Destructure once to avoid redundant access
	const { initialGdprTypes, initialComplianceSettings } = store;
	const {
		theme,
		disableAnimation = false,
		scrollLock = false,
		trapFocus = true,
		colorScheme = 'system',
		noStyle = false,
	} = react;

	// Memoize translation config to prevent recreation
	const preparedTranslationConfig = useMemo(() => {
		const mergedConfig = mergeTranslationConfigs(
			defaultTranslationConfig,
			translationConfig
		);
		const defaultLanguage = detectBrowserLanguage(
			mergedConfig.translations,
			mergedConfig.defaultLanguage,
			mergedConfig.disableAutoLanguageSwitch
		);
		return { ...mergedConfig, defaultLanguage };
	}, [translationConfig]);

	// Determine if using c15t.dev domain (memoize the calculation)
	const isConsentDomain = useMemo(() => {
		if (typeof window === 'undefined') {
			return false;
		}

		return Boolean(
			(mode === 'c15t' || mode === 'offline') &&
				(backendURL?.includes('c15t.dev') ||
					window.location.hostname.includes('c15t.dev'))
		);
	}, [mode, backendURL]);

	// Memoize the consent manager to prevent recreation
	const consentManager = useMemo(() => {
		if (mode === 'offline') {
			return configureConsentManager({
				mode: 'offline',
				callbacks,
				store,
			});
		}

		if (mode === 'custom' && 'endpointHandlers' in options) {
			return configureConsentManager({
				mode: 'custom',
				endpointHandlers: options.endpointHandlers,
				callbacks,
				store,
			});
		}

		return configureConsentManager({
			mode: 'c15t',
			backendURL: backendURL || '/api/c15t',
			callbacks,
			store,
		});
	}, [mode, backendURL, callbacks, store, options]);

	// Create a stable reference to the consent store and always initialize it
	const storeRef = useRef<ReturnType<typeof createConsentManagerStore>>(
		null as unknown as ReturnType<typeof createConsentManagerStore>
	);

	// Store previous core options for comparison
	const prevBackendURLRef = useRef(backendURL);
	const prevModeRef = useRef(mode);

	// Initialize the store and recreate when critical options change
	const consentStore = useMemo(() => {
		const storeWithTranslations = {
			...store,
			translationConfig: preparedTranslationConfig,
			isConsentDomain,
		};

		// Check if critical options that should trigger recreation have changed
		const shouldRecreateStore =
			// Use type guard to validate if store exists
			!storeRef.current ||
			prevBackendURLRef.current !== backendURL ||
			prevModeRef.current !== mode;

		// Update refs for next comparison
		prevBackendURLRef.current = backendURL;
		prevModeRef.current = mode;

		// Initialize the store on first render or when critical options change
		if (shouldRecreateStore) {
			storeRef.current = createConsentManagerStore(
				consentManager,
				storeWithTranslations
			);
		}

		return storeRef.current;
	}, [
		consentManager,
		isConsentDomain,
		preparedTranslationConfig,
		store,
		backendURL,
		mode,
	]);

	// Initialize state with the current state from the consent manager store
	const [state, setState] = useState<PrivacyConsentState>(
		consentStore.getState()
	);

	// Initialize the store with settings and set up subscription
	useEffect(() => {
		const { setGdprTypes, setComplianceSetting, setDetectedCountry } =
			consentStore.getState();

		// Initialize GDPR types if provided
		if (initialGdprTypes) {
			setGdprTypes(initialGdprTypes);
		}

		// Initialize compliance settings if provided
		if (initialComplianceSettings) {
			for (const [region, settings] of Object.entries(
				initialComplianceSettings
			)) {
				setComplianceSetting(region as ComplianceRegion, settings);
			}
		}

		// Set detected country from meta tag
		const country =
			document
				.querySelector('meta[name="user-country"]')
				?.getAttribute('content') || 'US';
		setDetectedCountry(country);

		// Subscribe to state changes only once
		const unsubscribe = consentStore.subscribe(setState);

		return unsubscribe;
	}, [consentStore, initialGdprTypes, initialComplianceSettings]);

	// Set the color scheme
	useColorScheme(colorScheme);

	// Memoize the theme context value to prevent unnecessary re-renders
	const themeContextValue = useMemo(
		() => ({
			theme,
			noStyle,
			disableAnimation,
			scrollLock,
			trapFocus,
		}),
		[theme, noStyle, disableAnimation, scrollLock, trapFocus]
	);

	// Memoize the full context value to prevent unnecessary re-renders
	const contextValue = useMemo(
		() => ({
			state,
			store: consentStore,
			manager: consentManager,
			theme,
			disableAnimation,
			scrollLock,
			trapFocus,
			colorScheme,
			noStyle,
		}),
		[
			state,
			consentStore,
			consentManager,
			theme,
			disableAnimation,
			scrollLock,
			trapFocus,
			colorScheme,
			noStyle,
		]
	);

	// Render the context providers with children
	return (
		<ConsentStateContext.Provider value={contextValue}>
			<GlobalThemeContext.Provider value={themeContextValue}>
				{children}
			</GlobalThemeContext.Provider>
		</ConsentStateContext.Provider>
	);
}
