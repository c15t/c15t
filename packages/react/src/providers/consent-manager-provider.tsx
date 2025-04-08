'use client';

import {
	type ComplianceRegion,
	type PrivacyConsentState,
	type StoreConfig,
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
 * - Using the provided API client instance
 * - Detecting user's region for compliance
 * - Managing consent state updates
 * - Providing access to consent management throughout the app
 *
 * @public
 */
export function ConsentManagerProvider({
	children,
	initialGdprTypes,
	initialComplianceSettings,
	namespace = 'c15tStore',
	noStyle = false,
	translationConfig,
	trackingBlockerConfig,
	manager,
	theme,
	disableAnimation = false,
	scrollLock = false,
	trapFocus = true,
	colorScheme = 'system',
}: ConsentManagerProviderProps) {
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

	// Create a stable reference to the store with prepared translation config
	const store = useMemo(() => {
		// Create the store
		const storeConfig: StoreConfig = {
			trackingBlockerConfig,
		};

		const store = createConsentManagerStore(manager, namespace, storeConfig);

		// Set translation config immediately
		store.getState().setTranslationConfig(preparedTranslationConfig);

		return store;
	}, [namespace, preparedTranslationConfig, trackingBlockerConfig, manager]);

	// Initialize state with the current state from the consent manager store
	const [state, setState] = useState<PrivacyConsentState>(store.getState());

	useEffect(() => {
		const { setGdprTypes, setComplianceSetting, setDetectedCountry } =
			store.getState();

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
		const unsubscribe = store.subscribe((newState: PrivacyConsentState) => {
			setState(newState);
		});

		// Cleanup subscription on unmount
		return () => {
			unsubscribe();
		};
	}, [store, initialGdprTypes, initialComplianceSettings]);

	// Memoize the context value to prevent unnecessary re-renders
	const contextValue = useMemo(
		() => ({
			state,
			store,
			manager,
		}),
		[state, store, manager]
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
