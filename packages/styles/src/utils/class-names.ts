/**
 * @packageDocumentation
 * Utility functions for CSS class name manipulation and merging
 * 
 * @description Provides type-safe, performant class name operations with conditional logic support
 * @version 1.5.0
 * @author C15T Team
 */

import clsx, { type ClassValue } from 'clsx';
import type { ClassNameValue } from '../types';
import { StyleError, type StyleErrorType } from '../types';

/**
 * Merges multiple class name values into a single string
 * 
 * @description Combines class names while handling duplicates, falsy values, and arrays
 * @template ClassNameInputType - The input type for class name values
 * 
 * @param classNames - Array of class name values to merge
 * @returns Merged class name string with duplicates removed
 * 
 * @throws {StyleError} When invalid class name types are provided
 * 
 * @example
 * Basic usage:
 * ```typescript
 * const className = mergeClassNames(['btn', 'btn-primary', undefined]);
 * // Returns: 'btn btn-primary'
 * ```
 * 
 * @example
 * Conditional classes:
 * ```typescript
 * const className = mergeClassNames([
 *   'btn',
 *   isActive && 'active',
 *   isPrimary ? 'btn-primary' : 'btn-secondary'
 * ]);
 * ```
 * 
 * @example
 * With nested arrays:
 * ```typescript
 * const className = mergeClassNames([
 *   'base',
 *   ['variant', 'size'],
 *   conditionalClasses
 * ]);
 * ```
 */
export function mergeClassNames<ClassNameInputType extends ClassValue>(
	...classNames: ClassNameInputType[]
): string {
	try {
		// Use clsx for efficient class name merging
		const merged = clsx(...classNames);
		
		// Remove duplicate class names while preserving order
		const uniqueClasses = Array.from(new Set(merged.split(' ').filter(Boolean)));
		
		return uniqueClasses.join(' ');
	} catch (error) {
		const styleError = new StyleError(
			'INVALID_CLASS_NAME' as StyleErrorType,
			`Failed to merge class names: ${error instanceof Error ? error.message : 'Unknown error'}`,
			{ classNames, originalError: error }
		);
		throw styleError;
	}
}

/**
 * Validates that a value is a valid class name
 * 
 * @description Ensures class name values conform to expected types and patterns
 * @template ClassNameType - The type of class name to validate
 * 
 * @param className - The class name value to validate
 * @returns True if the class name is valid
 * 
 * @throws {StyleError} When the class name format is invalid
 * 
 * @example
 * Validating string class names:
 * ```typescript
 * validateClassName('btn btn-primary'); // Returns: true
 * validateClassName(''); // Returns: true (empty is valid)
 * validateClassName(null); // Throws: StyleError
 * ```
 * 
 * @example
 * Validating array class names:
 * ```typescript
 * validateClassName(['btn', 'btn-primary']); // Returns: true
 * validateClassName(['btn', null]); // Throws: StyleError
 * ```
 */
export function validateClassName<ClassNameType extends ClassNameValue>(
	className: ClassNameType
): boolean {
	if (className === undefined || className === null) {
		return true; // Undefined/null are valid (will be filtered out)
	}
	
	if (typeof className === 'string') {
		return true; // All strings are valid class names
	}
	
	if (Array.isArray(className)) {
		// Validate each array element
		for (const item of className) {
			if (item !== undefined && item !== null && typeof item !== 'string') {
				throw new StyleError(
					'INVALID_CLASS_NAME' as StyleErrorType,
					`Array class name contains invalid type: expected string, got ${typeof item}`,
					{ className, invalidItem: item }
				);
			}
		}
		return true;
	}
	
	throw new StyleError(
		'INVALID_CLASS_NAME' as StyleErrorType,
		`Invalid class name type: expected string, array, or undefined, got ${typeof className}`,
		{ className }
	);
}

/**
 * Conditionally applies class names based on boolean conditions
 * 
 * @description Provides a fluent API for conditional class name application
 * @template ConditionType - The type of condition being evaluated
 * 
 * @param baseClasses - Base class names to always include
 * @param conditionalClasses - Object mapping conditions to class names
 * @returns Merged class name string with applied conditions
 * 
 * @example
 * Basic conditional classes:
 * ```typescript
 * const className = conditionalClassNames('btn', {
 *   'btn-primary': isPrimary,
 *   'btn-large': isLarge,
 *   'disabled': isDisabled
 * });
 * ```
 * 
 * @example
 * With complex conditions:
 * ```typescript
 * const className = conditionalClassNames(['btn', 'interactive'], {
 *   'btn-primary': variant === 'primary',
 *   'btn-secondary': variant === 'secondary',
 *   'btn-loading': isLoading && !isDisabled,
 *   'btn-icon-only': !children && hasIcon
 * });
 * ```
 * 
 * @example
 * With nested class arrays:
 * ```typescript
 * const className = conditionalClassNames('form-input', {
 *   ['error', 'shake']: hasError,
 *   ['success', 'fade-in']: isSuccess,
 *   'loading': isValidating
 * });
 * ```
 */
export function conditionalClassNames<ConditionType extends boolean>(
	baseClasses: ClassNameValue,
	conditionalClasses: Record<string, ConditionType>
): string {
	const allClasses: ClassNameValue[] = [baseClasses];
	
	// Add conditional classes based on their conditions
	for (const [className, condition] of Object.entries(conditionalClasses)) {
		if (condition) {
			// Handle both single class names and space-separated class names
			const classesToAdd = className.includes(' ') 
				? className.split(' ').filter(Boolean)
				: className;
			allClasses.push(classesToAdd);
		}
	}
	
	return mergeClassNames(...allClasses);
}

/**
 * Creates a class name builder with a base set of classes
 * 
 * @description Factory function that returns a builder for accumulating class names
 * @template BaseClassType - The type of base classes
 * 
 * @param baseClasses - Initial class names for the builder
 * @returns Object with methods for adding conditional and variant classes
 * 
 * @example
 * Building complex class names:
 * ```typescript
 * const className = createClassNameBuilder('btn')
 *   .variant('primary', isPrimary)
 *   .variant('large', size === 'large')
 *   .conditional({
 *     'loading': isLoading,
 *     'disabled': isDisabled
 *   })
 *   .build();
 * ```
 * 
 * @example
 * With base class array:
 * ```typescript
 * const className = createClassNameBuilder(['form', 'input'])
 *   .variant('error', hasError)
 *   .variant('success', isValid)
 *   .build();
 * ```
 */
export function createClassNameBuilder<BaseClassType extends ClassNameValue>(
	baseClasses: BaseClassType
) {
	const classes: ClassNameValue[] = [baseClasses];
	
	return {
		/**
		 * Adds a variant class conditionally
		 * 
		 * @param className - The class name to add
		 * @param condition - Whether to include the class
		 * @returns The builder instance for chaining
		 */
		variant(className: string, condition: boolean) {
			if (condition) {
				classes.push(className);
			}
			return this;
		},
		
		/**
		 * Adds multiple conditional classes
		 * 
		 * @param conditionalClasses - Object mapping class names to conditions
		 * @returns The builder instance for chaining
		 */
		conditional(conditionalClasses: Record<string, boolean>) {
			for (const [className, condition] of Object.entries(conditionalClasses)) {
				if (condition) {
					classes.push(className);
				}
			}
			return this;
		},
		
		/**
		 * Adds additional classes unconditionally
		 * 
		 * @param additionalClasses - Classes to add to the builder
		 * @returns The builder instance for chaining
		 */
		add(additionalClasses: ClassNameValue) {
			classes.push(additionalClasses);
			return this;
		},
		
		/**
		 * Builds the final class name string
		 * 
		 * @returns The merged class name string
		 */
		build(): string {
			return mergeClassNames(...classes);
		}
	};
}

/**
 * Normalizes class name input to a consistent array format
 * 
 * @description Converts various class name formats to a normalized array
 * @template InputType - The input class name type
 * 
 * @param input - Class name input in various formats
 * @returns Normalized array of class name strings
 * 
 * @example
 * Normalizing different input types:
 * ```typescript
 * normalizeClassNames('btn btn-primary'); // Returns: ['btn', 'btn-primary']
 * normalizeClassNames(['btn', 'btn-primary']); // Returns: ['btn', 'btn-primary']
 * normalizeClassNames(undefined); // Returns: []
 * ```
 * 
 * @example
 * With nested arrays:
 * ```typescript
 * normalizeClassNames([
 *   'btn',
 *   ['btn-primary', 'active'],
 *   'large'
 * ]); // Returns: ['btn', 'btn-primary', 'active', 'large']
 * ```
 */
export function normalizeClassNames<InputType extends ClassNameValue>(
	input: InputType
): string[] {
	if (!input) {
		return [];
	}
	
	if (typeof input === 'string') {
		return input.split(' ').filter(Boolean);
	}
	
	if (Array.isArray(input)) {
		const result: string[] = [];
		for (const item of input) {
			if (typeof item === 'string') {
				result.push(...item.split(' ').filter(Boolean));
			} else if (Array.isArray(item)) {
				result.push(...normalizeClassNames(item));
			}
		}
		return result;
	}
	
	return [];
}

/**
 * Checks if a class name contains a specific class
 * 
 * @description Safely checks for class presence in various class name formats
 * @template ClassNameType - The type of class name being checked
 * 
 * @param classNames - The class name value to search in
 * @param targetClass - The specific class to look for
 * @returns True if the target class is found
 * 
 * @example
 * Checking string class names:
 * ```typescript
 * hasClass('btn btn-primary active', 'btn-primary'); // Returns: true
 * hasClass('btn secondary', 'primary'); // Returns: false
 * ```
 * 
 * @example
 * Checking array class names:
 * ```typescript
 * hasClass(['btn', 'btn-primary'], 'btn-primary'); // Returns: true
 * hasClass(['btn', 'secondary'], 'primary'); // Returns: false
 * ```
 */
export function hasClass<ClassNameType extends ClassNameValue>(
	classNames: ClassNameType,
	targetClass: string
): boolean {
	const normalized = normalizeClassNames(classNames);
	return normalized.includes(targetClass);
}

/**
 * Removes specific classes from a class name value
 * 
 * @description Filters out specified classes while preserving others
 * @template ClassNameType - The type of class name being filtered
 * 
 * @param classNames - The class name value to filter
 * @param classesToRemove - Array of class names to remove
 * @returns Filtered class name string
 * 
 * @example
 * Removing specific classes:
 * ```typescript
 * removeClass('btn btn-primary active disabled', ['disabled', 'active']);
 * // Returns: 'btn btn-primary'
 * ```
 * 
 * @example
 * With array input:
 * ```typescript
 * removeClass(['btn', 'primary', 'disabled'], ['disabled']);
 * // Returns: 'btn primary'
 * ```
 */
export function removeClass<ClassNameType extends ClassNameValue>(
	classNames: ClassNameType,
	classesToRemove: string[]
): string {
	const normalized = normalizeClassNames(classNames);
	const filtered = normalized.filter(className => !classesToRemove.includes(className));
	return filtered.join(' ');
}

/**
 * Toggles a class name on or off
 * 
 * @description Adds or removes a class based on a condition
 * @template ClassNameType - The type of class name being toggled
 * 
 * @param classNames - The base class name value
 * @param className - The class to toggle
 * @param condition - Whether to add (true) or remove (false) the class
 * @returns Modified class name string
 * 
 * @example
 * Toggling classes:
 * ```typescript
 * toggleClass('btn btn-primary', 'active', isActive);
 * // Returns: 'btn btn-primary active' when isActive is true
 * // Returns: 'btn btn-primary' when isActive is false
 * ```
 * 
 * @example
 * With array input:
 * ```typescript
 * toggleClass(['btn', 'primary'], 'disabled', isDisabled);
 * ```
 */
export function toggleClass<ClassNameType extends ClassNameValue>(
	classNames: ClassNameType,
	className: string,
	condition: boolean
): string {
	const normalized = normalizeClassNames(classNames);
	const hasTheClass = normalized.includes(className);
	
	if (condition && !hasTheClass) {
		return mergeClassNames(classNames as ClassValue, className);
	}
	
	if (!condition && hasTheClass) {
		return removeClass(classNames, [className]);
	}
	
	return mergeClassNames(classNames);
}
