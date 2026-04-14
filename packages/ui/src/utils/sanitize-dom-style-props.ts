import type { ClassNameStyle } from '../theme/types';

/**
 * Strips internal style metadata before binding resolved styles to DOM elements.
 *
 * Framework adapters should use this when spreading the output of `resolveStyles()`
 * into rendered elements so flags like `noStyle` never leak as attributes.
 */
export function sanitizeDOMStyleProps<
	VariableMap = Record<string, string | number>,
>(
	style?: ClassNameStyle<VariableMap>
): Pick<ClassNameStyle<VariableMap>, 'className' | 'style'> {
	return {
		className: style?.className,
		style: style?.style,
	};
}
