'use client';

import { createContext } from 'react';
import type { Theme } from '~/types/theme';

/**
 * Configuration value type for the ThemeContext.
 *
 * @remarks
 * Provides type-safe theme customization options for components.
 * Supports both token-based (v2) and key-based (v1) themes.
 *
 * @typeParam T - The theme configuration type for the component
 *
 * @public
 */
export type ThemeContextValue = {
	/**
	 * Theme configuration object for styling components
	 * @default undefined
	 */
	theme?: Theme;

	/**
	 * Disables all animations when true
	 * @remarks Useful for reduced motion preferences
	 * @default false
	 */
	disableAnimation?: boolean;

	/**
	 * Removes default styles when true
	 * @remarks Enables fully custom styling
	 * @default false
	 */
	noStyle?: boolean;

	/**
	 * Locks the scroll when true & hides the overlay when disabled
	 * @remarks Useful for preventing scroll when a modal is open
	 * @default false
	 */
	scrollLock?: boolean;

	/**
	 * Traps keyboard focus within a dialog when true
	 * @remarks Enhances accessibility for modal dialogs
	 * @default true
	 */
	trapFocus?: boolean;

	/**
	 * Color scheme preference.
	 * @default 'system'
	 */
	colorScheme?: 'light' | 'dark' | 'system';
};

/**
 * Context for providing theme values to components.
 *
 * @remarks
 * Combines consent management state with theme configuration.
 * Must be provided by a parent Theme.Root component.
 * Supports TypeScript generic themes for type safety.
 *
 * @public
 */
export const GlobalThemeContext = createContext<ThemeContextValue>({
	theme: undefined,
	noStyle: false,
	disableAnimation: false,
	scrollLock: false,
	trapFocus: true,
	colorScheme: 'system',
});

/**
 * Context for providing theme values to components locally.
 *
 * @remarks
 * Allows for overriding theme values for specific component subtrees.
 *
 * @public
 */
export const LocalThemeContext = createContext<ThemeContextValue | null>(null);
