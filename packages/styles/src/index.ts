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
	// Core styling types
	ClassNameValue,
	ComponentStyleValue,
	ComponentStyleObject,
	CSSPropertiesWithVars,
	CSSCustomProperties,
	
	// Theme and configuration types
	ComponentTheme,
	ComponentPosition,
	ColorScheme,
	AnimationConfig,
	ResponsiveBreakpoints,
	ThemeContextValue,
	
	// Component and variant types
	ComponentVariant,
	CSSModuleClasses,
	
	// Result and utility types
	StyleMergeResult,
	StyleErrorType,
	
} from './types';

// Error class export
export { StyleError } from './types';

// Class name utilities
export {
	mergeClassNames,
	validateClassName,
	conditionalClassNames,
	createClassNameBuilder,
	normalizeClassNames,
	hasClass,
	removeClass,
	toggleClass,
} from './utils/class-names';

// Style merging utilities
export {
	deepMergeStyles,
	mergeComponentStyles,
	applyThemeStyles,
	createMemoizedStyleMerger,
	validateAndSanitizeStyles,
} from './utils/style-merging';

// Version information
export { version } from './version';
