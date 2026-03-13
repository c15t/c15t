/**
 * Svelte context for consent management state.
 *
 * Uses Svelte's setContext/getContext with $state runes
 * to provide reactive consent state throughout the component tree.
 */

import type { Theme, UIOptions } from '@c15t/ui/theme';
import type { ConsentManagerInterface, ConsentStoreState } from 'c15t';
import { getContext, setContext } from 'svelte';

const CONSENT_CONTEXT_KEY = Symbol('c15t-consent');
const THEME_CONTEXT_KEY = Symbol('c15t-theme');
const TRACKING_CONTEXT_KEY = Symbol('c15t-tracking');

/**
 * The consent context value shared through the component tree.
 */
export interface ConsentContextValue {
	readonly state: ConsentStoreState;
	readonly store: {
		getState: () => ConsentStoreState;
		subscribe: (listener: (state: ConsentStoreState) => void) => () => void;
		setState: (state: Partial<ConsentStoreState>) => void;
	};
	readonly manager: ConsentManagerInterface | null;
}

/**
 * The theme context value shared through the component tree.
 */
export interface ThemeContextValue {
	readonly theme?: Theme;
	readonly noStyle?: boolean;
	readonly disableAnimation?: boolean;
	readonly scrollLock?: boolean;
	readonly trapFocus?: boolean;
	readonly colorScheme?: UIOptions['colorScheme'];
}

/**
 * Sets the consent manager context. Called by ConsentManagerProvider.
 * @internal
 */
export function setConsentContext(value: ConsentContextValue): void {
	setContext(CONSENT_CONTEXT_KEY, value);
}

/**
 * Gets the consent manager context. Throws if used outside a provider.
 */
export function getConsentContext(): ConsentContextValue {
	const context = getContext<ConsentContextValue | undefined>(
		CONSENT_CONTEXT_KEY
	);

	if (context === undefined) {
		throw new Error(
			'getConsentContext must be used within a ConsentManagerProvider'
		);
	}

	return context;
}

/**
 * The consent tracking context value for propagating uiSource.
 */
export interface ConsentTrackingValue {
	readonly uiSource?: string;
}

/**
 * Sets the consent tracking context. Called by banner/dialog/widget roots.
 * @internal
 */
export function setTrackingContext(value: ConsentTrackingValue): void {
	setContext(TRACKING_CONTEXT_KEY, value);
}

/**
 * Gets the consent tracking context. Returns empty object if not set.
 */
export function getTrackingContext(): ConsentTrackingValue {
	return (
		getContext<ConsentTrackingValue | undefined>(TRACKING_CONTEXT_KEY) ?? {}
	);
}

/**
 * Sets the theme context. Called by ConsentManagerProvider.
 * @internal
 */
export function setThemeContext(value: ThemeContextValue): void {
	setContext(THEME_CONTEXT_KEY, value);
}

/**
 * Gets the theme context.
 */
export function getThemeContext(): ThemeContextValue {
	return (
		getContext<ThemeContextValue | undefined>(THEME_CONTEXT_KEY) ?? {
			noStyle: false,
			disableAnimation: false,
			scrollLock: false,
			trapFocus: true,
			colorScheme: 'system',
		}
	);
}
