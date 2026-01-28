/**
 * @packageDocumentation
 * Switch variant types and helper functions for generating CSS classes.
 * This module is framework-agnostic and can be used with React, Vue, Svelte, etc.
 */

import styles from './switch.module.css';

/**
 * Switch size variants.
 * @public
 */
export type SwitchSize = 'medium' | 'small';

/**
 * Switch variant props interface.
 * @public
 */
export interface SwitchVariantsProps {
	/**
	 * The size of the switch.
	 * @default 'medium'
	 */
	size?: SwitchSize;
}

/**
 * CSS variables for the root switch component.
 * @public
 */
export type SwitchRootCSSVariables = {
	'--switch-height': string;
	'--switch-width': string;
	'--switch-padding': string;
	'--switch-duration': string;
	'--switch-ease': string;
};

/**
 * CSS variables for the switch thumb component.
 * @public
 */
export type SwitchThumbCSSVariables = {
	'--switch-thumb-size': string;
	'--switch-thumb-size-disabled': string;
	'--switch-thumb-translate': string;
	'--switch-thumb-background-color': string;
	'--switch-thumb-background-color-disabled': string;
};

/**
 * CSS variables for the switch track component.
 * @public
 */
export type SwitchTrackCSSVariables = {
	'--switch-background-color': string;
	'--switch-background-color-hover': string;
	'--switch-background-color-checked': string;
	'--switch-background-color-disabled': string;
};

/**
 * All CSS variables used in the switch component.
 * @public
 */
export type SwitchCSSVariables = SwitchRootCSSVariables &
	SwitchThumbCSSVariables &
	SwitchTrackCSSVariables;

/**
 * Helper function to generate switch CSS classes based on variants.
 *
 * @remarks
 * This function takes variant props and returns an object with methods
 * to generate the appropriate CSS class names for the switch root, thumb, and track.
 *
 * @example
 * ```ts
 * const variants = switchVariants({ size: 'small' });
 * const rootClass = variants.root(); // Returns root CSS classes
 * const thumbClass = variants.thumb({ disabled: true }); // Returns thumb classes with disabled state
 * const trackClass = variants.track(); // Returns track CSS classes
 * ```
 *
 * @param props - The variant props for the switch
 * @returns An object with `root()`, `thumb()`, and `track()` methods for generating class names
 *
 * @public
 */
export const switchVariants = ({
	size = 'medium',
}: SwitchVariantsProps = {}) => {
	const sizeMap: Record<SwitchSize, keyof typeof styles | undefined> = {
		medium: undefined, // Default size, no additional class
		small: 'root-small',
	};

	const thumbSizeMap: Record<SwitchSize, keyof typeof styles | undefined> = {
		medium: undefined,
		small: 'thumb-small',
	};

	const trackSizeMap: Record<SwitchSize, keyof typeof styles | undefined> = {
		medium: undefined,
		small: 'track-small',
	};

	return {
		/**
		 * Generates the CSS class string for the switch root element.
		 * @param options - Optional configuration with a custom class to append
		 * @returns The combined CSS class string
		 */
		root: (options?: { class?: string; disabled?: boolean }) => {
			const classes = [styles.root];
			const sizeClass = sizeMap[size];
			if (sizeClass) {
				classes.push(styles[sizeClass]);
			}
			if (options?.class) {
				classes.push(options.class);
			}
			return classes.filter(Boolean).join(' ');
		},
		/**
		 * Generates the CSS class string for the switch thumb element.
		 * @param options - Optional configuration with a custom class and disabled state
		 * @returns The combined CSS class string
		 */
		thumb: (options?: { class?: string; disabled?: boolean }) => {
			const classes = [styles.thumb];
			const sizeClass = thumbSizeMap[size];
			if (sizeClass) {
				classes.push(styles[sizeClass]);
			}
			if (options?.disabled) {
				classes.push(styles['thumb-disabled']);
			}
			if (options?.class) {
				classes.push(options.class);
			}
			return classes.filter(Boolean).join(' ');
		},
		/**
		 * Generates the CSS class string for the switch track element.
		 * @param options - Optional configuration with a custom class and disabled state
		 * @returns The combined CSS class string
		 */
		track: (options?: { class?: string; disabled?: boolean }) => {
			const classes = [styles.track];
			const sizeClass = trackSizeMap[size];
			if (sizeClass) {
				classes.push(styles[sizeClass]);
			}
			if (options?.disabled) {
				classes.push(styles['track-disabled']);
			}
			if (options?.class) {
				classes.push(options.class);
			}
			return classes.filter(Boolean).join(' ');
		},
	};
};
