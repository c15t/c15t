/**
 * @packageDocumentation
 * Accordion variant types and helper functions for generating CSS classes.
 * This module is framework-agnostic and can be used with React, Vue, Svelte, etc.
 */

import styles from './accordion.module.css';

/**
 * Accordion variant types.
 * @public
 */
export type AccordionVariant = 'default' | 'bordered';

/**
 * Accordion size types.
 * @public
 */
export type AccordionSize = 'medium' | 'small';

/**
 * Accordion variant props interface.
 * @public
 */
export interface AccordionVariantsProps {
	/**
	 * The visual variant of the accordion.
	 * @default 'default'
	 */
	variant?: AccordionVariant;
	/**
	 * The size of the accordion.
	 * @default 'medium'
	 */
	size?: AccordionSize;
}

/**
 * CSS variables for the layout of the accordion component.
 * @public
 */
export type AccordionLayoutCSSVariables = {
	'--accordion-padding': string;
	'--accordion-radius': string;
	'--accordion-duration': string;
	'--accordion-ease': string;
	'--accordion-icon-size': string;
};

/**
 * CSS variables for the colors of the accordion component.
 * @public
 */
export type AccordionColorCSSVariables = {
	'--accordion-background-color': string;
	'--accordion-background-hover': string;
	'--accordion-border-color': string;
	'--accordion-text-color': string;
	'--accordion-icon-color': string;
	'--accordion-arrow-color': string;
	'--accordion-content-color': string;
	'--accordion-focus-ring': string;
};

/**
 * CSS variables for the root accordion component.
 * @public
 */
export type AccordionRootCSSVariables = AccordionLayoutCSSVariables &
	AccordionColorCSSVariables;

/**
 * CSS variables for the accordion item component.
 * @public
 */
export type AccordionItemCSSVariables = {
	'--accordion-background-color': string;
	'--accordion-border-color': string;
	'--accordion-radius': string;
};

/**
 * CSS variables for the accordion trigger component.
 * @public
 */
export type AccordionTriggerCSSVariables = {
	'--accordion-text-color': string;
	'--accordion-focus-ring': string;
	'--accordion-radius': string;
	'--accordion-padding': string;
};

/**
 * CSS variables for the accordion icon component.
 * @public
 */
export type AccordionIconCSSVariables = {
	'--accordion-icon-size': string;
	'--accordion-icon-color': string;
};

/**
 * CSS variables for the accordion content component.
 * @public
 */
export type AccordionContentCSSVariables = {
	'--accordion-duration': string;
	'--accordion-ease': string;
	'--accordion-content-color': string;
};

/**
 * All CSS variables used in the accordion component.
 * @public
 */
export type AccordionCSSVariables = AccordionRootCSSVariables;

/**
 * Helper function to generate accordion CSS classes based on variants.
 *
 * @remarks
 * This function takes variant props and returns an object with methods
 * to generate the appropriate CSS class names for accordion elements.
 *
 * @example
 * ```ts
 * const variants = accordionVariants({ variant: 'bordered', size: 'small' });
 * const rootClass = variants.root(); // Returns root CSS classes
 * const itemClass = variants.item(); // Returns item CSS classes
 * const triggerClass = variants.trigger(); // Returns trigger CSS classes
 * ```
 *
 * @param props - The variant props for the accordion
 * @returns An object with methods for generating class names for each element
 *
 * @public
 */
export const accordionVariants = ({
	variant = 'default',
	size = 'medium',
}: AccordionVariantsProps = {}) => {
	const variantMap: Record<AccordionVariant, keyof typeof styles | undefined> =
		{
			default: undefined,
			bordered: 'root-bordered',
		};

	const sizeMap: Record<AccordionSize, keyof typeof styles | undefined> = {
		medium: undefined,
		small: 'root-small',
	};

	return {
		/**
		 * Generates the CSS class string for the accordion root element.
		 * @param options - Optional configuration with a custom class to append
		 * @returns The combined CSS class string
		 */
		root: (options?: { class?: string }) => {
			const classes = [styles.root];
			const variantClass = variantMap[variant];
			if (variantClass) {
				classes.push(styles[variantClass]);
			}
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
		 * Generates the CSS class string for the accordion item element.
		 * @param options - Optional configuration with a custom class to append
		 * @returns The combined CSS class string
		 */
		item: (options?: { class?: string }) => {
			const classes = [styles.item];
			if (options?.class) {
				classes.push(options.class);
			}
			return classes.filter(Boolean).join(' ');
		},
		/**
		 * Generates the CSS class string for the accordion trigger element.
		 * @param options - Optional configuration with a custom class to append
		 * @returns The combined CSS class string
		 */
		trigger: (options?: { class?: string }) => {
			const classes = [styles.triggerInner];
			if (options?.class) {
				classes.push(options.class);
			}
			return classes.filter(Boolean).join(' ');
		},
		/**
		 * Generates the CSS class string for the accordion icon element.
		 * @param options - Optional configuration with a custom class to append
		 * @returns The combined CSS class string
		 */
		icon: (options?: { class?: string }) => {
			const classes = [styles.icon];
			if (options?.class) {
				classes.push(options.class);
			}
			return classes.filter(Boolean).join(' ');
		},
		/**
		 * Generates the CSS class string for the open arrow element.
		 * @param options - Optional configuration with a custom class to append
		 * @returns The combined CSS class string
		 */
		arrowOpen: (options?: { class?: string }) => {
			const classes = [styles.arrowOpen];
			if (options?.class) {
				classes.push(options.class);
			}
			return classes.filter(Boolean).join(' ');
		},
		/**
		 * Generates the CSS class string for the close arrow element.
		 * @param options - Optional configuration with a custom class to append
		 * @returns The combined CSS class string
		 */
		arrowClose: (options?: { class?: string }) => {
			const classes = [styles.arrowClose];
			if (options?.class) {
				classes.push(options.class);
			}
			return classes.filter(Boolean).join(' ');
		},
		/**
		 * Generates the CSS class string for the accordion content element.
		 * @param options - Optional configuration with a custom class to append
		 * @returns The combined CSS class string
		 */
		content: (options?: { class?: string }) => {
			const classes = [styles.content];
			if (options?.class) {
				classes.push(options.class);
			}
			return classes.filter(Boolean).join(' ');
		},
		/**
		 * Generates the CSS class string for the content inner wrapper element.
		 * @param options - Optional configuration with a custom class to append
		 * @returns The combined CSS class string
		 */
		contentInner: (options?: { class?: string }) => {
			const classes = [styles.contentInner];
			if (options?.class) {
				classes.push(options.class);
			}
			return classes.filter(Boolean).join(' ');
		},
	};
};
