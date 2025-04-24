'use client';

/**
 * @packageDocumentation
 * Provides hooks and utilities for managing component styles with theme support.
 * Implements a flexible styling system that merges theme and component-level styles.
 */

import { useMemo } from 'react';
import { useTheme } from '~/hooks/use-theme';
import type { AllThemeKeys } from '~/types/theme';
import type { ClassNameStyle, ThemeValue } from '~/types/theme';
import { mergeStyles } from '~/utils/merge-styles';

/**
 * Hook for retrieving and merging styles from theme context and component props.
 *
 * @remarks
 * This hook manages the style resolution process by:
 * - Retrieving styles from theme context
 * - Merging with component-level styles
 * - Handling style disabling through noStyle flags
 * - Memoizing results for performance
 *
 * @param themeKey - The theme key to lookup styles
 * @param componentStyle - Optional component-level styles to merge
 *
 * @example
 * ```tsx
 * const MyComponent = () => {
 *   const styles = useStyles('root', {
 *     className: 'custom-class',
 *     style: { backgroundColor: 'white' }
 *   });
 *
 *   return <div {...styles} />;
 * };
 * ```
 *
 * @returns An object containing merged className and style properties
 * @public
 */

export function useStyles(
	themeKey: AllThemeKeys,
	componentStyle?: ThemeValue
): ClassNameStyle {
	const { noStyle: contextNoStyle, theme } = useTheme();

	const mergedNoStyle =
		typeof componentStyle === 'object' && 'noStyle' in componentStyle
			? componentStyle.noStyle
			: contextNoStyle;

	// Memoize theme styles retrieval
	const themeStylesObject = useMemo(() => {
		return themeKey
			? (theme as Record<AllThemeKeys, ThemeValue>)?.[themeKey]
			: undefined; // Use undefined instead of null for consistency
	}, [themeKey, theme]);

	// Memoize the base merge of theme and component styles
	// componentStyle takes precedence over themeStylesObject
	const baseMergedStyle = useMemo(() => {
		return mergeStyles(themeStylesObject, componentStyle);
	}, [themeStylesObject, componentStyle]);

	// Return the final style object based on noStyle flag
	return useMemo(() => {
		if (mergedNoStyle) {
			// When noStyle is true, only return theme styles if they exist and are normalized
			if (!themeStylesObject) {
				return {}; // No theme, no style
			}
			// Return only the className and style from the theme object itself
			return typeof themeStylesObject === 'string'
				? { className: themeStylesObject }
				: {
						className: themeStylesObject.className,
						style: themeStylesObject.style,
					};
		}

		// When noStyle is false, return the base merged result
		// Ensure className is undefined if empty
		return {
			style: baseMergedStyle.style,
			className: baseMergedStyle.className || undefined,
		};
	}, [baseMergedStyle, mergedNoStyle, themeStylesObject]); // componentStyle is implicitly included via baseMergedStyle dependency
}
