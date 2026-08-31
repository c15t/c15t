'use client';

import { useContext, useMemo } from 'react';

import {
	GlobalThemeContext,
	LocalThemeContext,
} from '~/v3/context/theme-context';
import type { ThemeContextValue } from '~/v3/context/theme-context';

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
function isIndexableObject(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object';
}

function deepMerge<T extends object>(target: T, source?: Partial<T> | null): T {
	if (!source) {
		return target;
	}

	const result = { ...target } as T;

	for (const key of Object.keys(source) as (keyof T)[]) {
		const sourceValue = source[key];
		if (sourceValue !== undefined) {
			const targetValue = target[key];
			if (
				isIndexableObject(sourceValue) &&
				!Array.isArray(sourceValue) &&
				isIndexableObject(targetValue) &&
				!Array.isArray(targetValue)
			) {
				result[key] = deepMerge(
					targetValue,
					sourceValue as Partial<typeof targetValue>
				) as T[Extract<keyof T, string>];
			} else {
				result[key] = sourceValue as T[Extract<keyof T, string>];
			}
		}
	}

	return result;
}

export const useTheme = (): ThemeContextValue => {
	const globalContext = useContext(GlobalThemeContext);
	const localContext = useContext(LocalThemeContext);

	if (!globalContext) {
		throw new Error('Theme components must be used within Theme.Root');
	}

	// Deep merge the entire context, with local taking precedence
	return useMemo(
		() => deepMerge(globalContext, localContext || null),
		[globalContext, localContext]
	);
};
