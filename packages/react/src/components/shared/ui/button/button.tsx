import { Slot } from '@radix-ui/react-slot';

import {
	type ButtonHTMLAttributes,
	type ElementType,
	type ReactElement,
	forwardRef,
	useId,
} from 'react';
import { type VariantProps, tv } from 'tailwind-variants';
import type { PolymorphicComponentProps } from '../../libs/polymorphic';
import { recursiveCloneChildren } from '../../libs/recursive-clone-children';
import styles from './button.module.css';

/**
 * Constants for component display names
 * @internal
 */
const BUTTON_ROOT_NAME = 'ButtonRoot';
const BUTTON_ICON_NAME = 'ButtonIcon';

/**
 * Button component variant styles using tailwind-variants
 * @remarks
 * Defines the core styling variants for the Button component including:
 * - Base styles for the button and icon
 * - Variant styles (primary, neutral, error)
 * - Mode styles (filled, stroke, lighter, ghost)
 * - Size variants (medium, small, xsmall, xxsmall)
 *
 * @internal
 */
export const buttonVariants = tv({
	slots: {
		root: [styles.button],
		icon: [styles['button-icon']],
	},
	variants: {
		variant: {
			primary: {},
			neutral: {},
		},
		mode: {
			filled: {},
			stroke: {},
			lighter: {},
			ghost: {},
		},
		size: {
			medium: { root: styles['button-medium'] },
			small: { root: styles['button-small'] },
			xsmall: { root: styles['button-xsmall'] },
			xxsmall: { root: styles['button-xxsmall'] },
		},
	},
	compoundVariants: [
		// Primary variants
		{
			variant: 'primary',
			mode: 'filled',
			class: { root: styles['button-primary-filled'] },
		},
		{
			variant: 'primary',
			mode: 'stroke',
			class: { root: styles['button-primary-stroke'] },
		},
		{
			variant: 'primary',
			mode: 'lighter',
			class: { root: styles['button-primary-lighter'] },
		},
		{
			variant: 'primary',
			mode: 'ghost',
			class: { root: styles['button-primary-ghost'] },
		},

		// Neutral variants
		{
			variant: 'neutral',
			mode: 'filled',
			class: { root: styles['button-neutral-filled'] },
		},
		{
			variant: 'neutral',
			mode: 'stroke',
			class: { root: styles['button-neutral-stroke'] },
		},
		{
			variant: 'neutral',
			mode: 'lighter',
			class: { root: styles['button-neutral-lighter'] },
		},
		{
			variant: 'neutral',
			mode: 'ghost',
			class: { root: styles['button-neutral-ghost'] },
		},
	],
	defaultVariants: {
		variant: 'primary',
		mode: 'filled',
		size: 'medium',
	},
});

/**
 * Type definitions for button props
 * @internal
 */
export type ButtonSharedProps = VariantProps<typeof buttonVariants>;

/**
 * Props interface for the ButtonRoot component
 * @public
 */
type ButtonRootProps = VariantProps<typeof buttonVariants> &
	ButtonHTMLAttributes<HTMLButtonElement> & {
		/**
		 * When true, the component will render its children directly without wrapping them in a button element
		 */
		asChild?: boolean;
	};

/**
 * The root component for the Button compound component
 *
 * @remarks
 * ButtonRoot is the main container component that provides the core button functionality.
 * It supports various style variants, modes, and sizes through the buttonVariants configuration.
 *
 * @example
 * ```tsx
 * <ButtonRoot variant="primary" mode="filled" size="medium">
 *   <ButtonIcon as={IconComponent} />
 *   Click me
 * </ButtonRoot>
 * ```
 *
 * @param props - Component props including variant styles, mode, size, and standard button attributes
 * @param ref - Forward ref to access the underlying button element
 *
 * @public
 */
const ButtonRoot = forwardRef<HTMLButtonElement, ButtonRootProps>(
	(
		{ children, variant, mode, size, asChild, className, ...rest },
		forwardedRef
	) => {
		const uniqueId = useId();
		const Component = asChild ? Slot : 'button';
		const { root } = buttonVariants({ variant, mode, size });

		const sharedProps: ButtonSharedProps = {
			variant,
			mode,
			size,
		};

		const extendedChildren = recursiveCloneChildren(
			children as ReactElement[],
			sharedProps,
			[BUTTON_ICON_NAME],
			uniqueId,
			asChild
		);

		return (
			<Component
				ref={forwardedRef}
				className={root({ class: className })}
				tabIndex={0}
				{...rest}
			>
				{extendedChildren}
			</Component>
		);
	}
);
ButtonRoot.displayName = BUTTON_ROOT_NAME;

/**
 * The icon component for the Button compound component
 *
 * @remarks
 * ButtonIcon is a polymorphic component that can render any icon component while maintaining
 * consistent styling with the parent button. It inherits variant properties from ButtonRoot.
 *
 * @example
 * ```tsx
 * <ButtonRoot>
 *   <ButtonIcon as={MyIcon} />
 *   Button with Icon
 * </ButtonRoot>
 * ```
 *
 * @typeParam T - The element type to render the icon as
 * @param props - Component props including the polymorphic 'as' prop and shared button variant props
 *
 * @public
 */
function ButtonIcon<T extends ElementType>({
	variant,
	mode,
	size,
	as,
	className,
	...rest
}: PolymorphicComponentProps<T, ButtonSharedProps>) {
	const Component = as || 'div';
	const { icon } = buttonVariants({ mode, variant, size });

	return <Component className={icon({ class: className })} {...rest} />;
}
ButtonIcon.displayName = BUTTON_ICON_NAME;

/**
 * Export the compound components
 * @public
 */
export { ButtonRoot as Root, ButtonIcon as Icon };
