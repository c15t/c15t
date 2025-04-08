'use client';

import {
	type ComplianceRegion,
	type PrivacyConsentState,
	configureConsentManager,
	createConsentManagerStore,
	defaultTranslationConfig,
} from 'c15t';
import { useEffect, useMemo, useState } from 'react';
import { ConsentStateContext } from '../context/consent-manager-context';
import type { ConsentManagerProviderProps } from '../types/consent-manager';
import {
	detectBrowserLanguage,
	mergeTranslationConfigs,
} from '../utils/translations';

import { GlobalThemeContext } from '../context/theme-context';
import { useColorScheme } from '../hooks/use-color-scheme';
/**
 * @packageDocumentation
 * Provider component for consent management functionality.
 */

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
	// Extract options with defaults
	const {
		// Get store options
		store = {},
		// Get translation config
		translations: translationConfig,
		// Get React UI options
		react = {},
	} = options;

	const { initialGdprTypes, initialComplianceSettings } = store;

	const {
		theme,
		disableAnimation = false,
		scrollLock = false,
		trapFocus = true,
		colorScheme = 'system',
		noStyle = false,
	} = react;

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

	// Create the consent manager
	const consentManager = useMemo(() => {
		if (!options) {
			throw new Error('ConsentManagerProvider requires options to be provided');
		}
		const { store, translations, react, ...coreOpts } = options;
		return configureConsentManager(coreOpts);
	}, [options]);

	// Create a stable reference to the store with prepared translation config
	const consentStore = useMemo(() => {
		// Pass the entire store options object
		const storeWithTranslations = {
			...store,
			// Inject the prepared translation config
			translationConfig: preparedTranslationConfig,
		};

		return createConsentManagerStore(consentManager, storeWithTranslations);
	}, [store, preparedTranslationConfig, consentManager]);

	// Initialize state with the current state from the consent manager store
	const [state, setState] = useState<PrivacyConsentState>(
		consentStore.getState()
	);

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

		// Set detected country
		const country =
			document
				.querySelector('meta[name="user-country"]')
				?.getAttribute('content') || 'US';
		setDetectedCountry(country);

		// Subscribe to state changes
		const unsubscribe = consentStore.subscribe(
			(newState: PrivacyConsentState) => {
				setState(newState);
			}
		);

		// Cleanup subscription on unmount
		return () => {
			unsubscribe();
		};
	}, [consentStore, initialGdprTypes, initialComplianceSettings]);

	// Memoize the context value to prevent unnecessary re-renders
	const contextValue = useMemo(
		() => ({
			state,
			store: consentStore,
			manager: consentManager,
		}),
		[state, consentStore, consentManager]
	);

	// Pass theme context values
	const themeContextValue = useMemo(() => {
		return {
			theme,
			noStyle,
			disableAnimation,
			scrollLock,
			trapFocus,
		};
	}, [theme, noStyle, disableAnimation, scrollLock, trapFocus]);

	// Set the color scheme
	useColorScheme(colorScheme);

	return (
		<ConsentStateContext.Provider value={contextValue}>
			<GlobalThemeContext.Provider value={themeContextValue}>
				{children}
			</GlobalThemeContext.Provider>
		</ConsentStateContext.Provider>
	);
}
