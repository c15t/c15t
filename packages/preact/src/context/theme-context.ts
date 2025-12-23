
import { createContext } from 'preact';

/**
 * Configuration value type for the ThemeContext.
 *
 * @remarks
 * Provides type-safe theme customization options for components.
 * Supports generic theme types for different component variants.
 * Includes animation and style control features.
 *
 * @typeParam Theme - The theme configuration type for the component
 *
 * @example
 * ```tsx
 * type MyTheme = {
 *   colors: {
 *     primary: string;
 *     secondary: string;
 *   };
 * };
 *
 * const value: ThemeContextValue<MyTheme> = {
 *   theme: {
 *     colors: {
 *       primary: '#007bff',
 *       secondary: '#6c757d'
 *     }
 *   },
 *   noStyle: false,
 *   disableAnimation: false
 * };
 * ```
 *
 * @public
 */
export type ThemeContextValue<Theme = unknown> = {
	/**
	 * Theme configuration object for styling components
	 * @remarks Partial to allow incremental theme overrides
	 * @default undefined
	 */
	theme?: Partial<Theme>;

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
};

/**
 * Context for providing theme values to components.
 *
 * @remarks
 * Combines consent management state with theme configuration.
 * Must be provided by a parent Theme.Root component.
 * Supports TypeScript generic themes for type safety.
 *
 * @example
 * ```tsx
 * <ThemeContext.Provider value={{ theme: myTheme, noStyle: false }}>
 *   <App />
 * </ThemeContext.Provider>
 * ```
 *
 * @public
 */
export const GlobalThemeContext = createContext<ThemeContextValue>({
	theme: undefined,
	noStyle: false,
	disableAnimation: false,
	scrollLock: false,
	trapFocus: true,
});
/**
 * Context for providing theme values to components.
 *
 * @remarks
 * Combines consent management state with theme configuration.
 * Must be provided by a parent Theme.Root component.
 * Supports TypeScript generic themes for type safety.
 *
 * @example
 * ```tsx
 * <ThemeContext.Provider value={{ theme: myTheme, noStyle: false }}>
 *   <App />
 * </ThemeContext.Provider>
 * ```
 *
 * @public
 */
export const LocalThemeContext =
	createContext<ThemeContextValue<unknown> | null>(null);
