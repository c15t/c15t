/**
 * @packageDocumentation
 * Button variant types and helper functions for generating CSS classes.
 * This module is framework-agnostic and can be used with React, Vue, Svelte, etc.
 */

import styles from './button.module.css';

/**
 * Button visual variant type.
 * @public
 */
export type ButtonVariant = 'primary' | 'neutral';

/**
 * Button mode type - determines the visual style intensity.
 * @public
 */
export type ButtonMode = 'filled' | 'stroke' | 'lighter' | 'ghost';

/**
 * Button size type.
 * @public
 */
export type ButtonSize = 'medium' | 'small' | 'xsmall' | 'xxsmall';

/**
 * Props interface for button variants.
 * @public
 */
export interface ButtonVariantsProps {
	/**
	 * The visual variant of the button.
	 * @default 'primary'
	 */
	variant?: ButtonVariant;
	/**
	 * The mode/intensity of the button style.
	 * @default 'filled'
	 */
	mode?: ButtonMode;
	/**
	 * The size of the button.
	 * @default 'medium'
	 */
	size?: ButtonSize;
}

/**
 * Helper function to generate button CSS classes based on variants.
 *
 * @remarks
 * This function takes variant props and returns an object with methods
 * to generate the appropriate CSS class names for the button root and icon.
 *
 * @example
 * ```ts
 * const variants = buttonVariants({ variant: 'primary', mode: 'filled', size: 'medium' });
 * const rootClass = variants.root(); // Returns combined CSS classes
 * const iconClass = variants.icon(); // Returns icon-specific classes
 * ```
 *
 * @param props - The variant props for the button
 * @returns An object with `root()` and `icon()` methods for generating class names
 *
 * @public
 */
export const buttonVariants = ({
	variant = 'primary',
	mode = 'filled',
	size = 'medium',
}: ButtonVariantsProps = {}) => {
	const rootClasses = [styles.button, styles[`button-${size}`]];

	const compoundMap: Record<
		`${ButtonVariant}-${ButtonMode}`,
		keyof typeof styles
	> = {
		'primary-filled': 'button-primary-filled',
		'primary-stroke': 'button-primary-stroke',
		'primary-lighter': 'button-primary-lighter',
		'primary-ghost': 'button-primary-ghost',
		'neutral-filled': 'button-neutral-filled',
		'neutral-stroke': 'button-neutral-stroke',
		'neutral-lighter': 'button-neutral-lighter',
		'neutral-ghost': 'button-neutral-ghost',
	};

	rootClasses.push(styles[compoundMap[`${variant}-${mode}`]]);

	const iconClasses = [styles['button-icon']];

	return {
		/**
		 * Generates the CSS class string for the button root element.
		 * @param options - Optional configuration with a custom class to append
		 * @returns The combined CSS class string
		 */
		root: (options?: { class?: string }) => {
			return [...rootClasses, options?.class].filter(Boolean).join(' ');
		},
		/**
		 * Generates the CSS class string for the button icon element.
		 * @param options - Optional configuration with a custom class to append
		 * @returns The combined CSS class string
		 */
		icon: (options?: { class?: string }) => {
			return [...iconClasses, options?.class].filter(Boolean).join(' ');
		},
	};
};
