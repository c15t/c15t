/**
 * @packageDocumentation
 * Type definitions for the C15T styles system
 *
 * @description Provides comprehensive type safety for styling operations across components
 * @version 1.5.0
 * @author C15T Team
 */

/**
 * Represents a CSS class name value
 *
 * @description Union type supporting string class names, arrays of class names, or undefined
 * @template ClassNameType - The type of class name values
 *
 * @example
 * ```typescript
 * const className: ClassNameValue = 'btn btn-primary';
 * const classArray: ClassNameValue = ['btn', 'btn-primary'];
 * const conditionalClass: ClassNameValue = isActive ? 'active' : undefined;
 * ```
 */
export type ClassNameValue = string | string[] | undefined;

/**
 * CSS custom properties (CSS variables) with type-safe values
 *
 * @description Record type for CSS custom properties with strongly typed values
 * @template PropertyName - The CSS custom property name (must start with --)
 * @template PropertyValue - The value type for the custom property
 *
 * @example
 * ```typescript
 * const customProps: CSSCustomProperties = {
 *   '--banner-background-color': '#ffffff',
 *   '--banner-border-radius': '8px',
 *   '--banner-z-index': '999'
 * };
 * ```
 */
export type CSSCustomProperties = Record<`--${string}`, string | number>;

/**
 * Standard CSS properties extended with CSS custom properties
 *
 * @description Extends React's CSSProperties to include CSS custom properties
 * @template CustomProperties - Additional custom properties specific to component
 *
 * @example
 * ```typescript
 * const styles: CSSPropertiesWithVars = {
 *   backgroundColor: 'white',
 *   '--component-color': '#007bff',
 *   '--component-size': '16px'
 * };
 * ```
 */
export type CSSPropertiesWithVars<
	CustomProperties extends Record<string, unknown> = Record<string, never>,
> = React.CSSProperties & CSSCustomProperties & CustomProperties;

/**
 * Theme configuration for component styling
 *
 * @description Defines the structure for component theme configurations
 * @template ThemeKeys - Union of valid theme keys for the component
 *
 * @example
 * ```typescript
 * interface BannerTheme extends ComponentTheme<'root' | 'title' | 'description'> {
 *   root?: ComponentStyleValue;
 *   title?: ComponentStyleValue;
 *   description?: ComponentStyleValue;
 * }
 * ```
 */
export interface ComponentTheme {
	/** @description Disables all styling when true */
	noStyle?: boolean;
	/** @description Theme key-value pairs for component parts */
	[key: string]: ComponentStyleValue | boolean | undefined;
}

/**
 * Unified style value type supporting multiple input formats
 *
 * @description Flexible type that accommodates string class names, style objects, or arrays
 * @template StyleObjectType - Type for style object properties
 *
 * @example
 * ```typescript
 * // String class name
 * const style1: ComponentStyleValue = 'btn btn-primary';
 *
 * // Style object
 * const style2: ComponentStyleValue = {
 *   className: 'btn',
 *   style: { backgroundColor: 'blue' }
 * };
 *
 * // Array of styles
 * const style3: ComponentStyleValue = [
 *   'btn',
 *   { className: 'primary', style: { color: 'white' } }
 * ];
 * ```
 */
export type ComponentStyleValue<
	StyleObjectType extends Record<string, unknown> = Record<string, never>,
> =
	| string
	| ComponentStyleObject<StyleObjectType>
	| Array<string | ComponentStyleObject<StyleObjectType>>
	| undefined;

/**
 * Style object with class name and inline styles
 *
 * @description Object representation of component styling with optional properties
 * @template StyleProperties - Additional style properties specific to component
 *
 * @example
 * ```typescript
 * const styleObj: ComponentStyleObject = {
 *   className: 'banner-root',
 *   style: {
 *     '--banner-color': '#ffffff',
 *     backgroundColor: 'var(--banner-color)'
 *   },
 *   noStyle: false
 * };
 * ```
 */
export interface ComponentStyleObject<
	StyleProperties extends Record<string, unknown> = Record<string, never>,
> {
	/** @description CSS class name(s) to apply */
	className?: ClassNameValue;
	/** @description Inline CSS styles with custom properties support */
	style?: CSSPropertiesWithVars<StyleProperties>;
	/** @description Base CSS class name for component defaults */
	baseClassName?: ClassNameValue;
	/** @description Disables styling when true */
	noStyle?: boolean;
}

/**
 * Position variants for floating components
 *
 * @description Predefined position options for banners, widgets, and dialogs
 *
 * @example
 * ```typescript
 * const bannerPosition: ComponentPosition = 'bottom-right';
 * const widgetPosition: ComponentPosition = 'top-left';
 * ```
 */
export type ComponentPosition =
	| 'top-left'
	| 'top-right'
	| 'bottom-left'
	| 'bottom-right';

/**
 * Color scheme options for theming
 *
 * @description Theme mode selection with automatic system preference detection
 *
 * @example
 * ```typescript
 * const userScheme: ColorScheme = 'dark';
 * const systemScheme: ColorScheme = 'auto'; // Follows system preference
 * ```
 */
export type ColorScheme = 'light' | 'dark' | 'auto';

/**
 * Animation configuration options
 *
 * @description Controls animation behavior across components
 *
 * @example
 * ```typescript
 * const animConfig: AnimationConfig = {
 *   duration: 200,
 *   easing: 'ease-out',
 *   disabled: false
 * };
 * ```
 */
export interface AnimationConfig {
	/** @description Animation duration in milliseconds */
	duration?: number;
	/** @description CSS timing function for animations */
	easing?: string;
	/** @description Disables all animations when true */
	disabled?: boolean;
}

/**
 * Responsive breakpoint configuration
 *
 * @description Defines breakpoint values for responsive design
 *
 * @example
 * ```typescript
 * const breakpoints: ResponsiveBreakpoints = {
 *   mobile: 640,
 *   tablet: 768,
 *   desktop: 1024
 * };
 * ```
 */
export interface ResponsiveBreakpoints {
	/** @description Mobile breakpoint in pixels */
	mobile?: number;
	/** @description Tablet breakpoint in pixels */
	tablet?: number;
	/** @description Desktop breakpoint in pixels */
	desktop?: number;
}

/**
 * Theme context value for component trees
 *
 * @description Provides theme configuration throughout component hierarchy
 * @template ThemeType - Specific theme configuration type
 *
 * @example
 * ```typescript
 * const themeContext: ThemeContextValue<BannerTheme> = {
 *   theme: bannerTheme,
 *   colorScheme: 'auto',
 *   animation: { duration: 200 },
 *   noStyle: false
 * };
 * ```
 */
export interface ThemeContextValue<
	ThemeType extends ComponentTheme = ComponentTheme,
> {
	/** @description Theme configuration object */
	theme?: ThemeType;
	/** @description Color scheme preference */
	colorScheme?: ColorScheme;
	/** @description Animation configuration */
	animation?: AnimationConfig;
	/** @description Responsive breakpoint configuration */
	breakpoints?: ResponsiveBreakpoints;
	/** @description Global style disable flag */
	noStyle?: boolean;
	/** @description Disables animations globally */
	disableAnimation?: boolean;
	/** @description Enables scroll locking for modals */
	scrollLock?: boolean;
	/** @description Enables focus trapping for accessibility */
	trapFocus?: boolean;
}

/**
 * CSS module class name mapping
 *
 * @description Type-safe representation of CSS module exports
 * @template ClassNames - Union of available class names
 *
 * @example
 * ```typescript
 * const styles: CSSModuleClasses<'root' | 'title' | 'description'> = {
 *   root: 'banner_root_abc123',
 *   title: 'banner_title_def456',
 *   description: 'banner_description_ghi789'
 * };
 * ```
 */
export type CSSModuleClasses<ClassNames extends string = string> = Record<
	ClassNames,
	string
>;

/**
 * Style merging operation result
 *
 * @description Result type for style merging operations with metadata
 *
 * @example
 * ```typescript
 * const mergeResult: StyleMergeResult = {
 *   className: 'btn btn-primary custom-style',
 *   style: { backgroundColor: 'blue' },
 *   hasCustomStyles: true,
 *   appliedTheme: 'primary'
 * };
 * ```
 */
export interface StyleMergeResult {
	/** @description Final merged class name */
	className?: ClassNameValue;
	/** @description Final merged inline styles */
	style?: React.CSSProperties;
	/** @description Indicates if custom styles were applied */
	hasCustomStyles?: boolean;
	/** @description Name of applied theme variant */
	appliedTheme?: string;
}

/**
 * Component variant configuration
 *
 * @description Defines visual variants for components
 * @template VariantName - Name identifier for the variant
 *
 * @example
 * ```typescript
 * const primaryVariant: ComponentVariant<'primary'> = {
 *   name: 'primary',
 *   className: 'btn-primary',
 *   style: { backgroundColor: '#007bff' },
 *   isDefault: true
 * };
 * ```
 */
export interface ComponentVariant<VariantName extends string = string> {
	/** @description Unique name for the variant */
	name: VariantName;
	/** @description CSS class name for the variant */
	className?: string;
	/** @description Inline styles for the variant */
	style?: React.CSSProperties;
	/** @description Marks this variant as the default */
	isDefault?: boolean;
}

/**
 * Error types that can occur during style operations
 *
 * @description Categorizes different types of styling errors
 *
 * @throws {StyleError} When style operations fail
 *
 * @example
 * ```typescript
 * try {
 *   mergeStyles(invalidStyle1, invalidStyle2);
 * } catch (error) {
 *   if (error instanceof StyleError) {
 *     console.error(`Style error (${error.type}): ${error.message}`);
 *   }
 * }
 * ```
 */
export type StyleErrorType =
	| 'INVALID_CLASS_NAME'
	| 'INVALID_STYLE_OBJECT'
	| 'MERGE_CONFLICT'
	| 'THEME_NOT_FOUND'
	| 'CIRCULAR_REFERENCE';

/**
 * Custom error class for style-related operations
 *
 * @description Provides detailed error information for styling failures
 *
 * @example
 * ```typescript
 * throw new StyleError(
 *   'INVALID_CLASS_NAME',
 *   'Class name must be a string or array of strings',
 *   { className: 123 }
 * );
 * ```
 */
export class StyleError extends Error {
	/**
	 * Creates a new StyleError instance
	 *
	 * @param type - The category of style error
	 * @param message - Human-readable error description
	 * @param context - Additional context about the error
	 *
	 * @throws {StyleError} Always throws the created error instance
	 */
	constructor(
		public readonly type: StyleErrorType,
		message: string,
		public readonly context?: Record<string, unknown>
	) {
		super(message);
		this.name = 'StyleError';
	}
}

export type { AllThemeKeys } from './style-keys';
export type {
	ClassNameStyle,
	CSSVariables,
	ExtendThemeKeys,
	ThemeValue,
} from './style-types';
