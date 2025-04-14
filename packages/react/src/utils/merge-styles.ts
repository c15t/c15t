import type { ClassNameStyle, ThemeValue } from '~/types/theme';
import { cnExt } from '~/utils/cn';

/**
 * Merges two styles objects, handling theme values and style properties.
 *
 * @param style1 - The first style object to merge
 * @param style2 - The second style object to merge (Takes precedence over style1)
 *
 * @returns The merged styles object
 */
export function mergeStyles(
  style1: ThemeValue,
  style2?: ThemeValue
): ClassNameStyle {
  const getThemeValue = (
    style: ThemeValue | undefined
  ): ThemeValue | undefined => {
    if (typeof style === 'string' || style === undefined) {
      return style;
    }
    if ('className' in style || 'style' in style || 'noStyle' in style) {
      return style;
    }
    return undefined;
  };

  const s1 = getThemeValue(Array.isArray(style1) ? style1[0] : style1);
  const s2 = getThemeValue(style2);

  // If either style has noStyle, return empty styles
  if (
    (typeof s1 === 'object' && s1?.noStyle) ||
    (typeof s2 === 'object' && s2?.noStyle)
  ) {
    return {
      className: undefined,
      style: undefined,
    };
  }

  const className = cnExt([
    typeof s1 === 'string' ? s1 : s1?.className,
    typeof s2 === 'string' ? s2 : s2?.className,
    typeof s1 === 'object' && s1?.baseClassName,
    typeof s2 === 'object' && s2?.baseClassName,
  ]);

  const style = {
    ...(typeof s1 === 'object' && s1?.style),
    ...(typeof s2 === 'object' && s2?.style),
  };

  return {
    className: className || undefined,
    style: Object.keys(style).length > 0 ? style : undefined,
  };
}
