/**
 * @packageDocumentation
 * C15T Styles Package - Shared styling system for consent management components
 *
 * @description Comprehensive styling utilities, CSS modules, and theming system for C15T components
 * @version 1.5.0
 * @author C15T Team
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { mergeClassNames, applyThemeStyles } from '@c15t/styles';
 * import '@c15t/styles/components/cookie-banner.css';
 *
 * const className = mergeClassNames('btn', isActive && 'active');
 * ```
 *
 * @example
 * Advanced theming:
 * ```typescript
 * import {
 *   createMemoizedStyleMerger,
 *   type ComponentTheme,
 *   type StyleMergeResult
 * } from '@c15t/styles';
 *
 * const styleMerger = createMemoizedStyleMerger();
 * const mergedStyles = styleMerger(baseStyles, themeStyles, customStyles);
 * ```
 */

// Type exports
export type {
	AnimationConfig,
	// Core styling types
	ClassNameValue,
	ColorScheme,
	ComponentPosition,
	ComponentStyleObject,
	ComponentStyleValue,
	// Theme and configuration types
	ComponentTheme,
	// Component and variant types
	ComponentVariant,
	CSSCustomProperties,
	CSSModuleClasses,
	CSSPropertiesWithVars,
	ResponsiveBreakpoints,
	StyleErrorType,
	// Result and utility types
	StyleMergeResult,
	ThemeContextValue,
} from './types';

// Error class export
export { StyleError } from './types';

// Class name utilities
export {
	conditionalClassNames,
	createClassNameBuilder,
	hasClass,
	mergeClassNames,
	normalizeClassNames,
	removeClass,
	toggleClass,
	validateClassName,
} from './utils/class-names';
export { cnExt } from './utils/cn';
export { mergeStyles } from './utils/merge-styles';
// Style merging utilities
export {
	applyThemeStyles,
	createMemoizedStyleMerger,
	deepMergeStyles,
	mergeComponentStyles,
	validateAndSanitizeStyles,
} from './utils/style-merging';

// Version information
export { version } from './version';
