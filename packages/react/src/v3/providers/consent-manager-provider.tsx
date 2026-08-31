'use client';

import {
	clearConsentRuntimeCache as baseClearCache,
	defaultTranslationConfig,
	getOrCreateConsentRuntime,
} from '@c15t/core';
import type { Callbacks, ConsentStoreState } from '@c15t/core';
import type { KernelBranding } from '@c15t/core/v3';
import { generateThemeCSS } from '@c15t/ui/theme';
import { deepMerge } from '@c15t/ui/utils';
import { startTransition, useEffect, useMemo, useRef, useState } from 'react';

import { version } from '../../version';
import { ConsentStateContext } from '../context/consent-manager-context';
import type { ConsentStateContextValue } from '../context/consent-manager-context';
import { GlobalThemeContext } from '../context/theme-context';
import { useColorScheme } from '../hooks/use-color-scheme';
import { ConsentProvider } from '../provider';
import type { ConsentProviderOptions } from '../provider';
import type { ConsentManagerProviderProps } from '../types/consent-manager';
import { defaultTheme } from '../utils/theme-utils';

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
export function clearConsentRuntimeCache(): void {
	baseClearCache();
}

const CALLBACK_KEYS = [
	'onBannerFetched',
	'onConsentSet',
	'onConsentChanged',
	'onError',
	'onBeforeConsentRevocationReload',
] as const;

function pickCallbackProps(callbacks?: Callbacks): Callbacks {
	return {
		onBannerFetched: callbacks?.onBannerFetched,
		onConsentSet: callbacks?.onConsentSet,
		onConsentChanged: callbacks?.onConsentChanged,
		onError: callbacks?.onError,
		onBeforeConsentRevocationReload: callbacks?.onBeforeConsentRevocationReload,
	};
}

function toKernelBranding(
	branding: ConsentStoreState['branding']
): KernelBranding | undefined {
	return branding === 'c15t' || branding === 'consent' || branding === 'inth'
		? branding
		: undefined;
}

function toKernelBridgeOptions(
	options: ConsentManagerProviderProps['options'],
	state: ConsentStoreState
): ConsentProviderOptions {
	const language = state.translationConfig.defaultLanguage ?? 'en';
	const offlinePolicy = options.offlinePolicy?.policy;
	const policyModel = offlinePolicy?.model ?? state.model ?? 'opt-in';
	const policyMode =
		offlinePolicy?.ui?.mode ??
		(state.activeUI === 'dialog' ? 'dialog' : state.activeUI);
	return {
		colorScheme: options.colorScheme,
		components: options.components,
		consentCategories: state.consentCategories,
		disableAnimation: options.disableAnimation,
		iab: options.iab as ConsentProviderOptions['iab'],
		legalLinks: options.store?.legalLinks,
		mode: 'offline',
		noStyle: options.noStyle,
		overrides: options.overrides,
		prefetch: {
			initialBranding: toKernelBranding(state.branding),
			initialConsents: state.consents,
			initialPolicy: {
				...offlinePolicy,
				id: offlinePolicy?.id ?? 'legacy-compat-policy',
				model: policyModel,
				consent: {
					...offlinePolicy?.consent,
					categories:
						offlinePolicy?.consent?.categories ??
						(state.policyCategories && state.policyCategories.length > 0
							? state.policyCategories
							: state.consentCategories),
					scopeMode:
						offlinePolicy?.consent?.scopeMode ??
						state.policyScopeMode ??
						'permissive',
				},
				ui: {
					...offlinePolicy?.ui,
					mode: policyMode,
					banner: state.policyBanner,
					dialog: state.policyDialog,
				},
			},
			initialTranslations: {
				language,
				translations: (state.translationConfig.translations[language] ??
					state.translationConfig.translations.en ??
					defaultTranslationConfig.translations.en) as never,
			},
		},
		scrollLock: options.scrollLock,
		theme: options.theme,
		trapFocus: options.trapFocus,
	};
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
	// Initialize consent manager and store using shared runtime logic from core
	const { consentManager, consentStore } = useMemo(() => {
		return getOrCreateConsentRuntime(options, {
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
	const appliedCallbacksRef = useRef<Callbacks>(
		pickCallbackProps(options.callbacks)
	);

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

	const overrides = options.overrides;
	const callbacks = options.callbacks;

	// Keep runtime geo/language overrides in sync even when a cached runtime/store is reused.
	useEffect(() => {
		if (!consentStore) {
			return;
		}

		const currentOverrides = consentStore.getState().overrides ?? {};
		const nextOverrides = overrides ?? {};
		const hasDiff =
			currentOverrides.country !== nextOverrides.country ||
			currentOverrides.region !== nextOverrides.region ||
			currentOverrides.language !== nextOverrides.language ||
			currentOverrides.gpc !== nextOverrides.gpc;

		if (!hasDiff) {
			return;
		}

		void consentStore.getState().setOverrides({
			country: nextOverrides.country,
			region: nextOverrides.region,
			language: nextOverrides.language,
			gpc: nextOverrides.gpc,
		});
	}, [consentStore, overrides]);

	useEffect(() => {
		if (!consentStore) {
			return;
		}

		const nextCallbacks = pickCallbackProps(callbacks);
		const previousCallbacks = appliedCallbacksRef.current;
		const hasDiff = CALLBACK_KEYS.some(
			(key) => previousCallbacks[key] !== nextCallbacks[key]
		);

		if (!hasDiff) {
			return;
		}

		consentStore.setState((currentState) => ({
			callbacks: {
				...currentState.callbacks,
				...nextCallbacks,
			},
		}));
		appliedCallbacksRef.current = nextCallbacks;
	}, [callbacks, consentStore]);

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
	const kernelBridgeKey = [
		state.activeUI,
		state.branding,
		state.model,
		state.policyScopeMode,
		state.policyCategories?.join(',') ?? '',
		state.consentCategories?.join(',') ?? '',
	].join('|');

	return (
		<ConsentStateContext.Provider value={consentContextValue}>
			<GlobalThemeContext.Provider value={themeContextValue}>
				{themeCSS ? (
					<style
						id="c15t-theme"
						// oxlint-disable-next-line react/no-danger -- It's safe to set innerHTML here
						dangerouslySetInnerHTML={{ __html: themeCSS }}
					/>
				) : null}
				<ConsentProvider
					key={kernelBridgeKey}
					options={toKernelBridgeOptions(options, state)}
				>
					{children}
				</ConsentProvider>
			</GlobalThemeContext.Provider>
		</ConsentStateContext.Provider>
	);
}
