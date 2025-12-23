/**
 * @packageDocumentation
 * Advanced style merging utilities for component styling systems
 * 
 * @description Provides comprehensive style merging with theme support, performance optimization, and type safety
 * @version 1.5.0
 * @author C15T Team
 */

import type {
	ComponentStyleValue,
	ComponentStyleObject,
	CSSPropertiesWithVars,
	StyleMergeResult,
	StyleErrorType,
	ComponentTheme,
} from '../types';
import { StyleError } from '../types';
import { mergeClassNames, validateClassName } from './class-names';

/**
 * Deep merges CSS style objects with intelligent conflict resolution
 * 
 * @description Combines CSS properties while handling CSS custom properties and vendor prefixes
 * @template StyleType - The type of CSS style properties
 * 
 * @param baseStyles - The base style object to merge into
 * @param overrideStyles - The override styles that take precedence
 * @returns Merged CSS style object with resolved conflicts
 * 
 * @throws {StyleError} When style objects contain invalid property types
 * 
 * @example
 * Basic style merging:
 * ```typescript
 * const merged = deepMergeStyles(
 *   { backgroundColor: 'blue', margin: 10 },
 *   { backgroundColor: 'red', padding: 5 }
 * );
 * // Returns: { backgroundColor: 'red', margin: 10, padding: 5 }
 * ```
 * 
 * @example
 * With CSS custom properties:
 * ```typescript
 * const merged = deepMergeStyles(
 *   { '--primary-color': '#007bff', color: 'var(--primary-color)' },
 *   { '--primary-color': '#28a745', fontSize: '16px' }
 * );
 * // Returns: { '--primary-color': '#28a745', color: 'var(--primary-color)', fontSize: '16px' }
 * ```
 * 
 * @example
 * With nested transform objects:
 * ```typescript
 * const merged = deepMergeStyles(
 *   { transform: 'scale(1)' },
 *   { transform: 'rotate(45deg)' }
 * );
 * // Returns: { transform: 'rotate(45deg)' } (override wins)
 * ```
 */
export function deepMergeStyles<
	StyleType extends CSSPropertiesWithVars = CSSPropertiesWithVars
>(
	baseStyles?: StyleType,
	overrideStyles?: StyleType
): StyleType {
	if (!baseStyles && !overrideStyles) {
		return {} as StyleType;
	}
	
	if (!baseStyles) {
		return { ...overrideStyles } as StyleType;
	}
	
	if (!overrideStyles) {
		return { ...baseStyles } as StyleType;
	}
	
	try {
		const merged = { ...baseStyles };
		
		// Merge override styles, with special handling for complex properties
		for (const [key, value] of Object.entries(overrideStyles)) {
			if (value === undefined || value === null) {
				continue;
			}
			
			// Handle CSS custom properties (--property-name)
			if (key.startsWith('--')) {
				merged[key as keyof StyleType] = value;
				continue;
			}
			
			// For most CSS properties, override takes precedence
			merged[key as keyof StyleType] = value;
		}
		
		return merged;
	} catch (error) {
		throw new StyleError(
			'MERGE_CONFLICT' as StyleErrorType,
			`Failed to merge CSS styles: ${error instanceof Error ? error.message : 'Unknown error'}`,
			{ baseStyles, overrideStyles, originalError: error }
		);
	}
}

/**
 * Merges component style values with intelligent type handling
 * 
 * @description Combines various style input formats (strings, objects, arrays) into a unified result
 * @template StyleObjectType - The type of style object properties
 * 
 * @param baseStyle - The base style value to start with
 * @param overrideStyle - The override style that takes precedence
 * @returns Merged component style object with combined classes and styles
 * 
 * @throws {StyleError} When style values contain invalid formats
 * 
 * @example
 * Merging string and object styles:
 * ```typescript
 * const merged = mergeComponentStyles(
 *   'btn btn-base',
 *   { className: 'btn-primary', style: { color: 'white' } }
 * );
 * // Returns: { className: 'btn btn-base btn-primary', style: { color: 'white' } }
 * ```
 * 
 * @example
 * Merging complex style objects:
 * ```typescript
 * const merged = mergeComponentStyles(
 *   { 
 *     className: 'base-class',
 *     style: { backgroundColor: 'blue' },
 *     baseClassName: 'component-root'
 *   },
 *   {
 *     className: 'override-class',
 *     style: { color: 'white', backgroundColor: 'red' }
 *   }
 * );
 * ```
 * 
 * @example
 * With noStyle handling:
 * ```typescript
 * const merged = mergeComponentStyles(
 *   { className: 'styled-component' },
 *   { noStyle: true }
 * );
 * // Returns: { noStyle: true } (styling disabled)
 * ```
 */
export function mergeComponentStyles<
	StyleObjectType extends Record<string, unknown> = Record<string, never>
>(
	baseStyle?: ComponentStyleValue<StyleObjectType>,
	overrideStyle?: ComponentStyleValue<StyleObjectType>
): ComponentStyleObject<StyleObjectType> {
	// Handle noStyle flag - if either style has noStyle: true, disable all styling
	const baseNoStyle = typeof baseStyle === 'object' && !Array.isArray(baseStyle) && baseStyle?.noStyle;
	const overrideNoStyle = typeof overrideStyle === 'object' && !Array.isArray(overrideStyle) && overrideStyle?.noStyle;
	
	if (baseNoStyle || overrideNoStyle) {
		return { noStyle: true };
	}
	
	// Normalize styles to objects
	const normalizedBase = normalizeStyleValue(baseStyle);
	const normalizedOverride = normalizeStyleValue(overrideStyle);
	
	// Merge class names
	const mergedClassName = mergeClassNames(
		normalizedBase.baseClassName,
		normalizedBase.className,
		normalizedOverride.baseClassName,
		normalizedOverride.className
	);
	
	// Merge CSS styles
	const mergedStyle = deepMergeStyles(
		normalizedBase.style as CSSPropertiesWithVars,
		normalizedOverride.style as CSSPropertiesWithVars
	);
	
	return {
		className: mergedClassName || undefined,
		style: Object.keys(mergedStyle).length > 0 ? mergedStyle as CSSPropertiesWithVars<StyleObjectType> : undefined,
		baseClassName: normalizedOverride.baseClassName || normalizedBase.baseClassName,
		noStyle: false,
	};
}

/**
 * Normalizes various style value formats to a consistent object structure
 * 
 * @description Converts strings, arrays, and objects to a standardized ComponentStyleObject
 * @template StyleObjectType - The type of style object properties
 * 
 * @param style - The style value to normalize
 * @returns Normalized component style object
 * 
 * @throws {StyleError} When style format is invalid or unsupported
 * 
 * @internal
 * 
 * @example
 * Normalizing string styles:
 * ```typescript
 * const normalized = normalizeStyleValue('btn btn-primary');
 * // Returns: { className: 'btn btn-primary' }
 * ```
 * 
 * @example
 * Normalizing array styles:
 * ```typescript
 * const normalized = normalizeStyleValue([
 *   'base-class',
 *   { className: 'variant', style: { color: 'red' } }
 * ]);
 * ```
 */
function normalizeStyleValue<
	StyleObjectType extends Record<string, unknown> = Record<string, never>
>(
	style?: ComponentStyleValue<StyleObjectType>
): ComponentStyleObject<StyleObjectType> {
	if (!style) {
		return {};
	}
	
	if (typeof style === 'string') {
		validateClassName(style);
		return { className: style };
	}
	
	if (Array.isArray(style)) {
		// Recursively merge array elements
		return style.reduce<ComponentStyleObject<StyleObjectType>>(
			(acc, item) => mergeComponentStyles(acc, item),
			{}
		);
	}
	
	if (typeof style === 'object') {
		return { ...style };
	}
	
	throw new StyleError(
		'INVALID_STYLE_OBJECT' as StyleErrorType,
		`Invalid style value type: expected string, object, or array, got ${typeof style}`,
		{ style }
	);
}

/**
 * Applies theme styles to component base styles with intelligent merging
 * 
 * @description Combines component defaults with theme overrides while respecting noStyle flags
 * @template ThemeType - The type of theme configuration
 * @template StyleObjectType - The type of style object properties
 * 
 * @param componentBaseStyles - Default styles for the component
 * @param theme - Theme configuration with style overrides
 * @param themeKey - Specific theme key to apply from the theme
 * @param additionalStyles - Additional styles to merge on top
 * @returns Complete style merge result with metadata
 * 
 * @throws {StyleError} When theme key is not found or theme format is invalid
 * 
 * @example
 * Applying theme to button component:
 * ```typescript
 * const result = applyThemeStyles(
 *   { className: 'btn', style: { padding: '8px' } },
 *   { primary: { className: 'btn-primary', style: { backgroundColor: 'blue' } } },
 *   'primary',
 *   { className: 'custom-class' }
 * );
 * ```
 * 
 * @example
 * With theme inheritance:
 * ```typescript
 * const buttonTheme = {
 *   base: { className: 'btn-base', style: { borderRadius: '4px' } },
 *   primary: { className: 'btn-primary', style: { backgroundColor: '#007bff' } }
 * };
 * 
 * const result = applyThemeStyles(
 *   baseButtonStyles,
 *   buttonTheme,
 *   'primary'
 * );
 * ```
 */
export function applyThemeStyles<
	ThemeType extends ComponentTheme,
	StyleObjectType extends Record<string, unknown> = Record<string, never>
>(
	componentBaseStyles: ComponentStyleObject<StyleObjectType>,
	theme?: ThemeType,
	themeKey?: keyof ThemeType,
	additionalStyles?: ComponentStyleValue<StyleObjectType>
): StyleMergeResult {
	try {
		// Start with component base styles
		let currentStyles = { ...componentBaseStyles };
		let appliedTheme: string | undefined;
		
		// Apply theme styles if available
		if (theme && themeKey && theme[themeKey]) {
			const themeStyles = theme[themeKey] as ComponentStyleValue<StyleObjectType>;
			currentStyles = mergeComponentStyles(currentStyles, themeStyles);
			appliedTheme = String(themeKey);
		}
		
		// Apply additional styles
		if (additionalStyles) {
			currentStyles = mergeComponentStyles(currentStyles, additionalStyles);
		}
		
		// Check if custom styles were applied (beyond theme)
		const hasCustomStyles = Boolean(additionalStyles);
		
		return {
			className: currentStyles.className,
			style: currentStyles.style as React.CSSProperties,
			hasCustomStyles,
			appliedTheme,
		};
	} catch (error) {
		throw new StyleError(
			'THEME_NOT_FOUND' as StyleErrorType,
			`Failed to apply theme styles: ${error instanceof Error ? error.message : 'Unknown error'}`,
			{ 
				componentBaseStyles, 
				theme, 
				themeKey, 
				additionalStyles, 
				originalError: error 
			}
		);
	}
}

/**
 * Creates a memoized style merger for performance optimization
 * 
 * @description Returns a memoized function that caches style merge results for repeated operations
 * @template StyleType - The type of style values being merged
 * 
 * @param maxCacheSize - Maximum number of merge results to cache
 * @returns Memoized merge function with cache management
 * 
 * @example
 * Creating a performance-optimized style merger:
 * ```typescript
 * const memoizedMerger = createMemoizedStyleMerger<ButtonStyleValue>(100);
 * 
 * // These calls will be cached
 * const result1 = memoizedMerger(baseStyles, variantStyles);
 * const result2 = memoizedMerger(baseStyles, variantStyles); // Cache hit
 * ```
 * 
 * @example
 * With custom cache size:
 * ```typescript
 * const merger = createMemoizedStyleMerger<ComponentStyleValue>(50);
 * 
 * // Usage in component render
 * const styles = useMemo(() => 
 *   merger(theme.button, props.variant, props.customStyles),
 *   [theme.button, props.variant, props.customStyles]
 * );
 * ```
 */
export function createMemoizedStyleMerger<
	StyleType extends ComponentStyleValue = ComponentStyleValue
>(maxCacheSize: number = 200) {
	const cache = new Map<string, ComponentStyleObject>();
	
	return function memoizedMerge(
		...styles: (StyleType | undefined)[]
	): ComponentStyleObject {
		// Create a cache key from the styles
		const cacheKey = JSON.stringify(styles);
		
		// Check cache first
		if (cache.has(cacheKey)) {
			return cache.get(cacheKey)!;
		}
		
		// Perform the merge
		const merged = styles.reduce<ComponentStyleObject>(
			(acc, style) => mergeComponentStyles(acc, style),
			{}
		);
		
		// Manage cache size
		if (cache.size >= maxCacheSize) {
			// Remove oldest entry (first in the map)
			const firstKey = cache.keys().next().value;
			if (firstKey !== undefined) {
				cache.delete(firstKey);
			}
		}
		
		// Cache the result
		cache.set(cacheKey, merged);
		
		return merged;
	};
}

/**
 * Validates and sanitizes style objects for security and consistency
 * 
 * @description Ensures style objects are safe for rendering and follow expected patterns
 * @template StyleObjectType - The type of style object being validated
 * 
 * @param styleObject - The style object to validate and sanitize
 * @returns Sanitized style object with validated properties
 * 
 * @throws {StyleError} When style object contains invalid or unsafe properties
 * 
 * @example
 * Validating component styles:
 * ```typescript
 * const safe = validateAndSanitizeStyles({
 *   className: 'btn btn-primary',
 *   style: { 
 *     backgroundColor: '#007bff',
 *     '--custom-property': '16px'
 *   }
 * });
 * ```
 * 
 * @example
 * With potentially unsafe styles:
 * ```typescript
 * try {
 *   const safe = validateAndSanitizeStyles({
 *     style: { 
 *       content: 'javascript:alert("xss")',  // Potentially unsafe
 *       backgroundColor: 'blue'
 *     }
 *   });
 * } catch (error) {
 *   // Handle validation error
 * }
 * ```
 */
export function validateAndSanitizeStyles<
	StyleObjectType extends Record<string, unknown> = Record<string, never>
>(
	styleObject: ComponentStyleObject<StyleObjectType>
): ComponentStyleObject<StyleObjectType> {
	const sanitized = { ...styleObject };
	
	// Validate className
	if (sanitized.className !== undefined) {
		validateClassName(sanitized.className);
	}
	
	// Validate and sanitize CSS styles
	if (sanitized.style) {
		const sanitizedStyle: Record<string, unknown> = {};
		
		for (const [property, value] of Object.entries(sanitized.style)) {
			// Skip undefined/null values
			if (value === undefined || value === null) {
				continue;
			}
			
			// Validate property names (basic security check)
			if (typeof property !== 'string' || property.includes('<') || property.includes('>')) {
				throw new StyleError(
					'INVALID_STYLE_OBJECT' as StyleErrorType,
					`Invalid CSS property name: ${property}`,
					{ property, value }
				);
			}
			
			// Validate property values (basic security check)
			if (typeof value === 'string') {
				// Check for potentially dangerous content
				if (value.includes('javascript:') || value.includes('<script')) {
					throw new StyleError(
						'INVALID_STYLE_OBJECT' as StyleErrorType,
						`Potentially unsafe CSS value: ${value}`,
						{ property, value }
					);
				}
			}
			
			sanitizedStyle[property] = value;
		}
		
		sanitized.style = sanitizedStyle as CSSPropertiesWithVars<StyleObjectType>;
	}
	
	return sanitized;
}
