import type { ClassNameStyle, ThemeValue } from '~/types/theme';
import { cnExt } from '~/utils/cn';

/**
 * Merges two styles objects, handling theme values and style properties.
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
	const normalize = (
		style: ThemeValue | undefined
	): ClassNameStyle | undefined => {
		if (style === undefined) return undefined;
		if (typeof style === 'string') return { className: style };
		return style as ClassNameStyle;
	};

	const s1 = normalize(style1);
	const s2 = normalize(style2);

	// If either style has noStyle, we should respect it.
	// In the v2 system, noStyle logic is mostly handled in useStyles,
	// but we keep some basic protection here.
	if (s1?.noStyle || s2?.noStyle) {
		// If s2 has noStyle, it completely overrides s1
		if (s2?.noStyle) {
			return {
				className: s2.className,
				style: s2.style,
				noStyle: true,
			};
		}
	}

	// Correct order: baseClassName -> s1 classes -> s2 classes
	const className = cnExt(
		s1?.baseClassName,
		s1?.className,
		s2?.baseClassName,
		s2?.className
	);

	const mergedStyle = {
		...s1?.style,
		...s2?.style,
	};

	return {
		className: className || undefined,
		style: Object.keys(mergedStyle).length > 0 ? mergedStyle : undefined,
		noStyle: s1?.noStyle || s2?.noStyle,
	};
}
