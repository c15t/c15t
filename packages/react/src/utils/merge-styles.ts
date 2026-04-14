import { mergeStyles as baseMergeStyles } from '@c15t/ui/utils';
import type { ClassNameStyle, ThemeValue } from '~/types/theme';

/**
 * Merges two styles objects, handling theme values and style properties.
 * This React version uses React-specific types but uses the core logic from @c15t/ui.
 *
 * @param style1 - The first style object to merge (lower precedence)
 * @param style2 - The second style object to merge (Takes precedence over style1)
 *
 * @returns The merged styles object
 */
export function mergeStyles(
	style1: ThemeValue,
	style2?: ThemeValue
): ClassNameStyle {
	return baseMergeStyles(style1 as any, style2 as any) as ClassNameStyle;
}
