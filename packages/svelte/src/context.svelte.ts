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
 *
 * `state` is provided via a getter in ConsentManagerProvider, so it always
 * reflects the latest store snapshot. Methods on ConsentStoreState (e.g.
 * setActiveUI, saveConsents, setSelectedConsent) are stable references
 * bound to the store instance — they do not change between state updates,
 * so it is safe to call them through `consent.state.methodName(...)`.
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
 * Flat accessor for consent state and manager.
 *
 * Svelte equivalent of React's `useConsentManager()`. Returns an object
 * with getters that always reflect the latest consent state snapshot,
 * plus the consent manager instance.
 *
 * @example
 * ```svelte
 * <script>
 *   const consent = getConsentManager();
 *   // Access state reactively via getters
 *   $: console.log(consent.activeUI, consent.consents);
 *   // Call methods directly
 *   consent.setActiveUI('dialog');
 * </script>
 * ```
 */
export function getConsentManager(): ConsentStoreState & {
	manager: ConsentManagerInterface | null;
} {
	const ctx = getConsentContext();

	return new Proxy(
		{} as ConsentStoreState & { manager: ConsentManagerInterface | null },
		{
			get(_target, prop) {
				if (prop === 'manager') return ctx.manager;
				return (ctx.state as unknown as Record<string | symbol, unknown>)[prop];
			},
			set(_target, prop) {
				throw new Error(
					`[c15t] consent.${String(prop)} is read-only. Use state methods like setActiveUI() instead.`
				);
			},
			has(_target, prop) {
				if (prop === 'manager') return true;
				return prop in ctx.state;
			},
			ownKeys() {
				return [...Object.keys(ctx.state), 'manager'];
			},
			getOwnPropertyDescriptor(_target, prop) {
				if (prop === 'manager' || prop in ctx.state) {
					return { configurable: true, enumerable: true, writable: false };
				}
				return undefined;
			},
		}
	);
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
