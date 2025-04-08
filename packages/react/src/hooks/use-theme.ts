'use client';

import { useContext } from 'react';
import { GlobalThemeContext, LocalThemeContext } from '~/context/theme-context';

/**
 * Hook to access the current theme context.
 *
 * @remarks
 * Provides type-safe access to theme values and consent management state.
 * Throws an error if used outside of a Theme.Root component.
 * Supports TypeScript inference for theme types.
 *
 * @throws {Error} When used outside of a Theme.Root component
 *
 * @example
 * ```tsx
 * const MyComponent = () => {
 *   const { theme, noStyle, disableAnimation } = useTheme();
 *
 *   return (
 *     <div className={theme?.myClass}>
 *       {!disableAnimation && <AnimatedContent />}
 *     </div>
 *   );
 * };
 * ```
 *
 * @returns The current theme context value
 * @public
 */

/**
 * Deep merges two objects recursively
 */
function deepMerge<T extends Record<string, unknown>>(
	target: T,
	source?: Partial<T> | null
): T {
	if (!source) { return target; }

	const result = { ...target } as T;

	for (const key in source) {
		if (source[key] !== undefined) {
			if (
				source[key] &&
				typeof source[key] === 'object' &&
				!Array.isArray(source[key]) &&
				target[key] &&
				typeof target[key] === 'object'
			) {
				result[key] = deepMerge(
					target[key] as Record<string, unknown>,
					source[key] as Record<string, unknown>
				) as T[Extract<keyof T, string>];
			} else {
				result[key] = source[key] as T[Extract<keyof T, string>];
			}
		}
	}

	return result;
}

export const useTheme = () => {
	const globalContext = useContext(GlobalThemeContext);
	const localContext = useContext(LocalThemeContext);

	if (!globalContext) {
		throw new Error('Theme components must be used within Theme.Root');
	}

	// Deep merge the entire context, with local taking precedence
	const context = deepMerge(globalContext, localContext || null);

	return context;
};
