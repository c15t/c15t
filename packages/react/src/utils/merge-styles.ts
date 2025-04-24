import type { ClassNameStyle, ThemeValue } from '~/types/theme';
import { cnExt } from '~/utils/cn';

/**
 * Normalizes a ThemeValue into a ClassNameStyle object.
 * If the input is already a ClassNameStyle object, it's returned as is.
 * If the input is a string, it's treated as a className.
 * Undefined or null inputs result in an empty ClassNameStyle object.
 *
 * @param value - The ThemeValue to normalize.
 * @returns A normalized ClassNameStyle object.
 * @internal
 */
function normalizeStyleValue(value: ThemeValue | undefined): ClassNameStyle {
	if (typeof value === 'string') {
		return { className: value };
	}
	if (typeof value === 'object' && value !== null) {
		// Return only className and style, ignore other potential props like noStyle
		return {
			className: value.className,
			style: value.style,
		};
	}
	return {};
}

/**
 * Merges two style representations (ThemeValue) into a single ClassNameStyle object.
 * It combines classNames and deeply merges style objects.
 * Style properties from style2 take precedence over style1.
 * The `noStyle` property is ignored by this function; handling `noStyle` is the responsibility of the caller.
 *
 * @param style1 - The base style object or className string.
 * @param style2 - The style object or className string to merge over style1.
 * @returns The merged ClassNameStyle object containing combined className and style.
 */
export function mergeStyles(
	style1: ThemeValue | undefined,
	style2: ThemeValue | undefined
): ClassNameStyle {
	const s1 = normalizeStyleValue(style1);
	const s2 = normalizeStyleValue(style2);

	const className = cnExt([s1.className, s2.className]);

	const style =
		s1.style || s2.style
			? {
					...s1.style,
					...s2.style,
				}
			: undefined;

	return {
		// Ensure className is undefined if empty string, otherwise cnExt result
		className: className || undefined,
		style: style,
	};
}
