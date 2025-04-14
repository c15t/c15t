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
  // Extract options with defaults
  const {
    mode,
    backendURL,
    callbacks,
    store = {},
    translations: translationConfig,
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

  // Directly use configureConsentManager with the original options
  const consentManager = useMemo(() => {
    // Create the appropriate client options based on mode
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

    // Default to c15t mode
    return configureConsentManager({
      mode: 'c15t',
      backendURL: backendURL || '/api/c15t',
      callbacks,
      store,
    });
  }, [mode, backendURL, callbacks, store, options]);

  // Determine if using c15t.dev domain at the provider level
  const isConsentDomain = useMemo(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    // More comprehensive check for c15t domain
    const isC15tDomain =
      (mode === 'c15t' || mode === 'offline') &&
      (backendURL?.includes('c15t.dev') ||
        window.location.hostname.includes('c15t.dev'));

    return Boolean(isC15tDomain);
  }, [mode, backendURL]);

  // Create a stable reference to the store with prepared translation config
  const consentStore = useMemo(() => {
    // Pass the entire store options object
    const storeWithTranslations = {
      ...store,
      // Inject the prepared translation config
      translationConfig: preparedTranslationConfig,
      // Explicitly pass the isConsentDomain flag
      isConsentDomain,
    };

    return createConsentManagerStore(consentManager, storeWithTranslations);
  }, [store, preparedTranslationConfig, consentManager, isConsentDomain]);

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

  // Set the color scheme
  useColorScheme(colorScheme);

  // Memoize the context value to prevent unnecessary re-renders
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

  // Memoize the theme context value
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

  return (
    <ConsentStateContext.Provider value={contextValue}>
      <GlobalThemeContext.Provider value={themeContextValue}>
        {children}
      </GlobalThemeContext.Provider>
    </ConsentStateContext.Provider>
  );
}
