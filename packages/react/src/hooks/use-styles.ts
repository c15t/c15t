import { resolveStyles } from '@c15t/ui/utils';
import { useMemo } from 'react';
import { useTheme } from '~/hooks/use-theme';
import type { AllThemeKeys, ClassNameStyle, ThemeValue } from '~/types/theme';

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
		return resolveStyles(
			themeKey,
			theme,
			componentStyle as any,
			contextNoStyle
		) as ClassNameStyle;
	}, [themeKey, theme, componentStyle, contextNoStyle]);
}
