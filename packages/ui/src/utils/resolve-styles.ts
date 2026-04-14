import type {
	AllThemeKeys,
	ClassNameStyle,
	Theme,
	ThemeValue,
} from '../theme/types';
import { mergeStyles } from './merge-styles';

/**
 * Pure logic for retrieving and merging styles from theme and component props.
 * Framework-agnostic version of useStyles logic.
 *
 * Precedence (lowest to highest):
 * 1. Component internal base classes (baseClassName)
 * 2. Theme slot classes (from theme context)
 * 3. Component prop classes (from className prop)
 */
export function resolveStyles(
	themeKey: AllThemeKeys,
	theme?: Theme,
	componentStyle?: ThemeValue,
	contextNoStyle = false
): ClassNameStyle {
	const themeStyle = theme?.slots?.[themeKey];

	// Handle noStyle flags
	const themeNoStyle =
		typeof themeStyle === 'object' && themeStyle !== null
			? Boolean((themeStyle as ClassNameStyle).noStyle)
			: false;

	const componentNoStyle =
		typeof componentStyle === 'object' && componentStyle !== null
			? Boolean((componentStyle as ClassNameStyle).noStyle)
			: false;

	const isNoStyle = contextNoStyle || themeNoStyle || componentNoStyle;

	// If noStyle is active, we only return the overrides, skipping base classes
	if (isNoStyle) {
		// Merge theme overrides with component overrides
		const merged = mergeStyles(themeStyle || {}, componentStyle || {});
		return {
			className: merged.className,
			style: merged.style,
			noStyle: true,
		};
	}

	// Standard merge: theme overrides applied ON TOP of component defaults
	const baseDefaults: ThemeValue =
		typeof componentStyle === 'object'
			? { ...(componentStyle as ClassNameStyle), className: undefined }
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
}
