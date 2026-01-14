import { useMemo } from 'react';
import { useTheme } from '~/hooks/use-theme';
import type { AllThemeKeys, ClassNameStyle, ThemeValue } from '~/types/theme';
import { mergeStyles } from '~/utils/merge-styles';

/**
 * Hook for retrieving and merging styles from theme context and component props.
 *
 * @remarks
 * This hook manages the style resolution process by pulling styles from
 * theme slots and merging them with component-level props.
 *
 * Precedence (lowest to highest):
 * 1. Component internal base classes (baseClassName)
 * 2. Theme slot classes (from theme context)
 * 3. Component prop classes (from className prop)
 *
 * @param themeKey - The slot key to lookup styles (e.g. 'bannerCard')
 * @param componentStyle - Optional component-level styles to merge
 * @param themeOverride - Optional theme override
 *
 * @returns An object containing merged className and style properties
 * @public
 */
export function useStyles(
	themeKey: AllThemeKeys,
	componentStyle?: ThemeValue,
	themeOverride?: any
): ClassNameStyle {
	const { noStyle: contextNoStyle, theme: contextTheme } = useTheme();

	// Use override if provided, otherwise fallback to context theme
	const theme = themeOverride ?? contextTheme;

	return useMemo(() => {
		const themeStyle = (theme?.slots as any)?.[themeKey];

		// Handle noStyle flags
		const themeNoStyle =
			typeof themeStyle === 'object' && themeStyle !== null
				? Boolean(themeStyle.noStyle)
				: false;

		const componentNoStyle =
			typeof componentStyle === 'object' && componentStyle !== null
				? Boolean(componentStyle.noStyle)
				: false;

		const isNoStyle = contextNoStyle || themeNoStyle || componentNoStyle;

		// If noStyle is active, we only return the overrides, skipping base classes
		if (isNoStyle) {
			// Merge theme overrides with component overrides
			const merged = mergeStyles(themeStyle || {}, componentStyle || {});
			return {
				className: merged.className,
				style: merged.style,
			};
		}

		// Standard merge: theme overrides applied ON TOP of component defaults
		// We use a base object to hold componentStyle's baseClassName and other internal info
		const baseDefaults: ThemeValue =
			typeof componentStyle === 'object'
				? { ...componentStyle, className: undefined }
				: {};

		// 1. Start with internal base classes and defaults from component
		// 2. Apply theme overrides from slots
		const withTheme = mergeStyles(baseDefaults, themeStyle || {});

		// 3. Apply component prop overrides (className, style)
		const final = mergeStyles(withTheme, componentStyle || {});

		return {
			className: final.className,
			style: final.style,
		};
	}, [themeKey, theme, componentStyle, contextNoStyle]);
}
