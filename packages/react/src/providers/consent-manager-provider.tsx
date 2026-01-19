'use client';

import { generateThemeCSS } from '@c15t/ui/theme';
import {
	clearConsentManagerCache as baseClearCache,
	deepMerge,
	initConsentManager,
} from '@c15t/ui/utils';
import type { ConsentStoreState } from 'c15t';
import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import {
	ConsentStateContext,
	type ConsentStateContextValue,
} from '../context/consent-manager-context';
import { GlobalThemeContext } from '../context/theme-context';
import { useColorScheme } from '../hooks/use-color-scheme';
import type { ConsentManagerProviderProps } from '../types/consent-manager';
import { defaultTheme } from '../utils/theme-utils';
import { version } from '../version';

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
	baseClearCache();
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
	// Initialize consent manager and store using shared logic from @c15t/ui
	const { consentManager, consentStore } = useMemo(() => {
		return initConsentManager(options, {
			pkg: '@c15t/react',
			version,
		});
	}, [options]);

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
				{themeCSS ? (
					<style
						id="c15t-theme"
						// biome-ignore lint/security/noDangerouslySetInnerHtml: It's safe to set innerHTML here
						dangerouslySetInnerHTML={{ __html: themeCSS }}
					/>
				) : null}
				{children}
			</GlobalThemeContext.Provider>
		</ConsentStateContext.Provider>
	);
}
