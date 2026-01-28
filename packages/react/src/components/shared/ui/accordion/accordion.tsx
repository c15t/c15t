'use client';

import {
	type AccordionSize,
	type AccordionVariant,
	type AccordionVariantsProps,
	accordionVariants,
} from '@c15t/ui/styles/primitives';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import {
	type ComponentPropsWithoutRef,
	type ComponentRef,
	type ElementType,
	forwardRef,
	type HTMLAttributes,
} from 'react';
import type { PolymorphicComponentProps } from '~/components/shared/libs/polymorphic';
import { LucideIcon } from '~/components/shared/ui/icon';
import { useTheme } from '~/hooks/use-theme';
import type { ThemeValue } from '~/types/theme';

// Re-export types for convenience
export type { AccordionSize, AccordionVariant, AccordionVariantsProps };

// Re-export the helper function
export { accordionVariants };

const ACCORDION_ROOT_NAME = 'AccordionRoot';
const ACCORDION_ITEM_NAME = 'AccordionItem';
const ACCORDION_ICON_NAME = 'AccordionIcon';
const ACCORDION_ARROW_NAME = 'AccordionArrow';
const ACCORDION_TRIGGER_NAME = 'AccordionTrigger';
const ACCORDION_CONTENT_NAME = 'AccordionContent';
const AccordionHeader = AccordionPrimitive.Header;

export type AccordionStylesKeys = {
	'accordion.root'?: ThemeValue;
	'accordion.item': ThemeValue;
	'accordion.trigger': ThemeValue;
	'accordion.icon': ThemeValue;
	'accordion.arrow.open': ThemeValue;
	'accordion.arrow.close': ThemeValue;
	'accordion.content': ThemeValue;
	'accordion.content-inner': ThemeValue;
};

/**
 * Props for AccordionRoot component.
 * @public
 */
export type AccordionRootProps = ComponentPropsWithoutRef<
	typeof AccordionPrimitive.Root
> &
	AccordionVariantsProps & {
		/**
		 * When true, removes default styles.
		 */
		noStyle?: boolean;
	};

const AccordionRoot = forwardRef<
	ComponentRef<typeof AccordionPrimitive.Root>,
	AccordionRootProps
>(
	(
		{ className, variant = 'default', size = 'medium', noStyle, ...rest },
		forwardedRef
	) => {
		const { noStyle: contextNoStyle } = useTheme();
		const variants = accordionVariants({ variant, size });

		const finalNoStyle = contextNoStyle || noStyle;
		const rootClassName = finalNoStyle
			? className
			: variants.root({ class: className as string | undefined });

		return (
			<AccordionPrimitive.Root
				ref={forwardedRef}
				className={rootClassName}
				{...rest}
			/>
		);
	}
);

AccordionRoot.displayName = ACCORDION_ROOT_NAME;

/**
 * Props for AccordionItem component.
 * @public
 */
export interface AccordionItemProps
	extends ComponentPropsWithoutRef<typeof AccordionPrimitive.Item> {
	/**
	 * When true, removes default styles.
	 */
	noStyle?: boolean;
}

const AccordionItem = forwardRef<
	ComponentRef<typeof AccordionPrimitive.Item>,
	AccordionItemProps
>(({ className, noStyle, ...rest }, forwardedRef) => {
	const { noStyle: contextNoStyle } = useTheme();
	const variants = accordionVariants();

	const finalNoStyle = contextNoStyle || noStyle;
	const itemClassName = finalNoStyle
		? className
		: variants.item({ class: className });

	return (
		<AccordionPrimitive.Item
			ref={forwardedRef}
			className={itemClassName}
			{...rest}
		/>
	);
});
AccordionItem.displayName = ACCORDION_ITEM_NAME;

/**
 * Props for AccordionTrigger component.
 * @public
 */
export interface AccordionTriggerProps
	extends ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger> {
	/**
	 * When true, removes default styles.
	 */
	noStyle?: boolean;
}

const AccordionTrigger = forwardRef<
	ComponentRef<typeof AccordionPrimitive.Trigger>,
	AccordionTriggerProps
>(({ children, className, noStyle, ...rest }, forwardedRef) => {
	const { noStyle: contextNoStyle } = useTheme();
	const variants = accordionVariants();

	const finalNoStyle = contextNoStyle || noStyle;
	const triggerClassName = finalNoStyle
		? className
		: variants.trigger({ class: className });

	return (
		<AccordionPrimitive.Trigger
			ref={forwardedRef}
			className={triggerClassName}
			{...rest}
		>
			{children}
		</AccordionPrimitive.Trigger>
	);
});
AccordionTrigger.displayName = ACCORDION_TRIGGER_NAME;

/**
 * Props for AccordionIcon component.
 * @public
 */
export interface AccordionIconBaseProps extends Record<string, unknown> {
	/**
	 * When true, removes default styles.
	 */
	noStyle?: boolean;
}

function AccordionIcon<T extends ElementType>({
	className,
	noStyle,
	as,
	...rest
}: PolymorphicComponentProps<T, AccordionIconBaseProps>) {
	const variants = accordionVariants();

	const classNameStr = typeof className === 'string' ? className : undefined;
	const iconClassName = noStyle
		? classNameStr
		: variants.icon({ class: classNameStr });

	const Component = as || 'div';

	return <Component className={iconClassName} {...rest} />;
}
AccordionIcon.displayName = ACCORDION_ICON_NAME;

/**
 * Props for AccordionArrow component.
 * @public
 */
type AccordionArrowProps = HTMLAttributes<HTMLDivElement> & {
	/**
	 * Custom open icon element.
	 */
	openIcon?: { Element: ElementType; className?: string };
	/**
	 * Custom close icon element.
	 */
	closeIcon?: { Element: ElementType; className?: string };
	/**
	 * When true, removes default styles.
	 */
	noStyle?: boolean;
};

function AccordionArrow({
	openIcon = {
		Element: LucideIcon({
			title: 'Open',
			iconPath: <path d="M5 12h14M12 5v14" />,
		}),
	},
	closeIcon = {
		Element: LucideIcon({ title: 'Close', iconPath: <path d="M5 12h14" /> }),
	},
	noStyle,
	...rest
}: AccordionArrowProps) {
	const variants = accordionVariants();

	const openClassName = noStyle
		? openIcon.className
		: variants.arrowOpen({ class: openIcon.className });

	const closeClassName = noStyle
		? closeIcon.className
		: variants.arrowClose({ class: closeIcon.className });

	return (
		<>
			<openIcon.Element {...rest} className={openClassName} />
			<closeIcon.Element {...rest} className={closeClassName} />
		</>
	);
}
AccordionArrow.displayName = ACCORDION_ARROW_NAME;

/**
 * Props for AccordionContent component.
 * @public
 */
export interface AccordionContentProps
	extends ComponentPropsWithoutRef<typeof AccordionPrimitive.Content> {
	/**
	 * When true, removes default styles.
	 */
	noStyle?: boolean;
	/**
	 * Class name for the inner content wrapper.
	 */
	innerClassName?: string;
}

const AccordionContent = forwardRef<
	ComponentRef<typeof AccordionPrimitive.Content>,
	AccordionContentProps
>(({ children, className, innerClassName, noStyle, ...rest }, forwardedRef) => {
	const { noStyle: contextNoStyle } = useTheme();
	const variants = accordionVariants();

	const finalNoStyle = contextNoStyle || noStyle;
	const contentClassName = finalNoStyle
		? className
		: variants.content({ class: className });

	const contentInnerClassName = finalNoStyle
		? innerClassName
		: variants.contentInner({ class: innerClassName });

	return (
		<AccordionPrimitive.Content
			ref={forwardedRef}
			className={contentClassName}
			{...rest}
		>
			<div className={contentInnerClassName}>{children}</div>
		</AccordionPrimitive.Content>
	);
});
AccordionContent.displayName = ACCORDION_CONTENT_NAME;

export {
	AccordionRoot as Root,
	AccordionHeader as Header,
	AccordionItem as Item,
	AccordionTrigger as Trigger,
	AccordionIcon as Icon,
	AccordionArrow as Arrow,
	AccordionContent as Content,
};
