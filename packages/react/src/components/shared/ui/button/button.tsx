import { Slot } from '@radix-ui/react-slot';

import {
	type ButtonHTMLAttributes,
	type ElementType,
	type ReactElement,
	forwardRef,
	useId,
} from 'react';
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
 * Button variant types
 */
export type ButtonVariant = 'primary' | 'neutral';
export type ButtonMode = 'filled' | 'stroke' | 'lighter' | 'ghost';
export type ButtonSize = 'medium' | 'small' | 'xsmall' | 'xxsmall';

/**
 * Button variants props interface
 */
export interface ButtonVariantsProps {
	variant?: ButtonVariant;
	mode?: ButtonMode;
	size?: ButtonSize;
}

// Define a type that can be used with PolymorphicComponentProps
export interface ButtonIconProps extends Record<string, unknown> {
	variant?: ButtonVariant;
	mode?: ButtonMode;
	size?: ButtonSize;
}

/**
 * Helper function to generate button classes based on variants
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
		root: (options?: { class?: string }) => {
			return [...rootClasses, options?.class].filter(Boolean).join(' ');
		},
		icon: (options?: { class?: string }) => {
			return [...iconClasses, options?.class].filter(Boolean).join(' ');
		},
	};
};

// Type for props that can be used with recursiveCloneChildren
export type RecursiveCloneableProps = Record<string, unknown>;

/**
 * Type definitions for button props
 * @internal
 */
export type ButtonSharedProps = ButtonVariantsProps;

/**
 * Props interface for the ButtonRoot component
 * @public
 */
type ButtonRootProps = ButtonSharedProps &
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

		// Create shared props object that can be safely passed to recursiveCloneChildren
		const cloneableProps: RecursiveCloneableProps = {};
		if (variant) {
			cloneableProps.variant = variant;
		}
		if (mode) {
			cloneableProps.mode = mode;
		}
		if (size) {
			cloneableProps.size = size;
		}

		const extendedChildren = recursiveCloneChildren(
			children as ReactElement[],
			cloneableProps,
			[BUTTON_ICON_NAME],
			uniqueId,
			asChild
		);

		return (
			<Component
				ref={forwardedRef}
				className={root({ class: className })}
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
}: PolymorphicComponentProps<T, ButtonIconProps>) {
	const Component = as || 'div';
	const { icon } = buttonVariants({
		variant: variant as ButtonVariant | undefined,
		mode: mode as ButtonMode | undefined,
		size: size as ButtonSize | undefined,
	});

	return (
		<Component
			className={icon({ class: className as string | undefined })}
			{...rest}
		/>
	);
}
ButtonIcon.displayName = BUTTON_ICON_NAME;

/**
 * Export the compound components
 * @public
 */
export { ButtonRoot as Root, ButtonIcon as Icon };
