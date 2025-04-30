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

	const themeNoStyle = Boolean(
		typeof theme?.[themeKey as keyof typeof theme] === 'object'
			? (theme?.[themeKey as keyof typeof theme] as ClassNameStyle)?.noStyle
			: false
	);

	const mergedNoStyle =
		typeof componentStyle === 'object' && 'noStyle' in componentStyle
			? componentStyle.noStyle
			: (themeNoStyle ?? contextNoStyle);

	// Memoize theme styles retrieval
	const themeStylesObject = useMemo(() => {
		return themeKey
			? (theme as Record<AllThemeKeys, ThemeValue>)?.[themeKey]
			: null;
	}, [themeKey, theme]);

	// Memoize initial style setup
	const initialStyle = useMemo(() => {
		const initial = {
			className:
				typeof componentStyle === 'string'
					? componentStyle
					: componentStyle?.className,
			style: undefined,
		};

		return initial;
	}, [componentStyle]);

	// Memoize merged style with context
	const mergedWithContext = useMemo(() => {
		const merged = themeStylesObject
			? mergeStyles(initialStyle, themeStylesObject)
			: initialStyle;

		return merged;
	}, [initialStyle, themeStylesObject]);

	// Memoize final merged style
	const finalMergedStyle = useMemo(() => {
		const final = componentStyle
			? mergeStyles(mergedWithContext, componentStyle)
			: mergedWithContext;

		return final;
	}, [mergedWithContext, componentStyle]);

	// Return the final merged style, ensuring immutability
	return useMemo(() => {
		if (mergedNoStyle) {
			// When noStyle is true, only return theme styles if they exist
			if (!themeStylesObject) {
				return {};
			}

			const noStyleResult =
				typeof themeStylesObject === 'string'
					? { className: themeStylesObject }
					: {
							className: themeStylesObject.className,
							style: themeStylesObject.style,
						};
			return noStyleResult;
		}

		// Ensure className is included and prevent duplication
		const finalClassName = Array.from(
			new Set(
				[
					typeof componentStyle === 'string'
						? componentStyle
						: componentStyle?.className,
					finalMergedStyle.className,
				]
					.filter(Boolean)
					.flat()
			)
		).join(' ');

		return { ...finalMergedStyle, className: finalClassName };
	}, [finalMergedStyle, mergedNoStyle, themeStylesObject, componentStyle]);
}
