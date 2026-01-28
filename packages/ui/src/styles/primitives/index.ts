/**
 * @packageDocumentation
 * Primitive component variant types and helper functions.
 *
 * This module exports framework-agnostic variant helpers that generate
 * CSS class names for Button, Switch, and Accordion components.
 * These can be used across React, Vue, Svelte, and other frameworks.
 *
 * @example
 * ```ts
 * import { buttonVariants, switchVariants, accordionVariants } from '@c15t/ui/styles/primitives';
 *
 * // Generate button classes
 * const btnClasses = buttonVariants({ variant: 'primary', mode: 'filled', size: 'medium' });
 * console.log(btnClasses.root()); // CSS class string
 *
 * // Generate switch classes
 * const switchClasses = switchVariants({ size: 'small' });
 * console.log(switchClasses.track({ disabled: true })); // CSS class string with disabled state
 * ```
 */

// Accordion exports
export {
	type AccordionColorCSSVariables,
	type AccordionContentCSSVariables,
	type AccordionCSSVariables,
	type AccordionIconCSSVariables,
	type AccordionItemCSSVariables,
	type AccordionLayoutCSSVariables,
	type AccordionRootCSSVariables,
	type AccordionSize,
	type AccordionTriggerCSSVariables,
	type AccordionVariant,
	type AccordionVariantsProps,
	accordionVariants,
} from './accordion';
// Button exports
export {
	type ButtonMode,
	type ButtonSize,
	type ButtonVariant,
	type ButtonVariantsProps,
	buttonVariants,
} from './button';
// Switch exports
export {
	type SwitchCSSVariables,
	type SwitchRootCSSVariables,
	type SwitchSize,
	type SwitchThumbCSSVariables,
	type SwitchTrackCSSVariables,
	type SwitchVariantsProps,
	switchVariants,
} from './switch';
