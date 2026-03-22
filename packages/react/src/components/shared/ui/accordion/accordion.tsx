'use client';

import {
	type AccordionType,
	isAccordionItemOpen,
	toggleAccordionValue,
} from '@c15t/ui/primitives/accordion';
import { getDataDisabled } from '@c15t/ui/primitives/data-state';
import {
	type AccordionSize,
	type AccordionVariant,
	type AccordionVariantsProps,
	accordionVariants,
} from '@c15t/ui/styles/primitives/accordion';
import {
	type ButtonHTMLAttributes,
	createContext,
	type ElementType,
	forwardRef,
	type HTMLAttributes,
	useContext,
	useId,
	useMemo,
} from 'react';
import type { PolymorphicComponentProps } from '~/components/shared/libs/polymorphic';
import { useControllableState } from '~/components/shared/libs/use-controllable-state';
import { LucideIcon } from '~/components/shared/ui/icon';
import { useTheme } from '~/hooks/use-theme';
import type { ThemeValue } from '~/types/theme';

export type { AccordionSize, AccordionVariant, AccordionVariantsProps };
export { accordionVariants };

const ACCORDION_ROOT_NAME = 'AccordionRoot';
const ACCORDION_ITEM_NAME = 'AccordionItem';
const ACCORDION_ICON_NAME = 'AccordionIcon';
const ACCORDION_ARROW_NAME = 'AccordionArrow';
const ACCORDION_TRIGGER_NAME = 'AccordionTrigger';
const ACCORDION_CONTENT_NAME = 'AccordionContent';
const ACCORDION_HEADER_NAME = 'AccordionHeader';

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

type AccordionContextValue = {
	collapsible?: boolean;
	noStyle?: boolean;
	onItemToggle: (value: string) => void;
	type: AccordionType;
	value: string | string[] | undefined;
};

type AccordionItemContextValue = {
	contentId: string;
	disabled?: boolean;
	open: boolean;
	triggerId: string;
	value: string;
};

const AccordionContext = createContext<AccordionContextValue | null>(null);
const AccordionItemContext = createContext<AccordionItemContextValue | null>(
	null
);

function useAccordionContext() {
	const context = useContext(AccordionContext);

	if (!context) {
		throw new Error('Accordion components must be used within AccordionRoot');
	}

	return context;
}

function useAccordionItemContext() {
	const context = useContext(AccordionItemContext);

	if (!context) {
		throw new Error('Accordion components must be used within AccordionItem');
	}

	return context;
}

export type AccordionRootProps = HTMLAttributes<HTMLDivElement> &
	AccordionVariantsProps & {
		collapsible?: boolean;
		defaultValue?: string | string[];
		noStyle?: boolean;
		onValueChange?: (value: string | string[]) => void;
		type: AccordionType;
		value?: string | string[];
	};

const AccordionRoot = forwardRef<HTMLDivElement, AccordionRootProps>(
	(
		{
			children,
			className,
			collapsible,
			defaultValue,
			noStyle,
			onValueChange,
			size = 'medium',
			type,
			value,
			variant = 'default',
			...rest
		},
		forwardedRef
	) => {
		const { noStyle: contextNoStyle } = useTheme();
		const variants = accordionVariants({ variant, size });
		const finalNoStyle = contextNoStyle || noStyle;
		const [currentValue, setCurrentValue] = useControllableState<
			string | string[] | undefined
		>({
			defaultValue:
				defaultValue ?? (type === 'multiple' ? ([] as string[]) : undefined),
			onChange: (nextValue) => {
				if (nextValue !== undefined) {
					onValueChange?.(nextValue);
				}
			},
			value,
		});

		const rootClassName = finalNoStyle
			? className
			: variants.root({ class: className as string | undefined });

		const contextValue = useMemo<AccordionContextValue>(
			() => ({
				collapsible,
				noStyle: finalNoStyle,
				onItemToggle: (itemValue) => {
					setCurrentValue(
						toggleAccordionValue({
							collapsible,
							itemValue,
							type,
							value: currentValue,
						})
					);
				},
				type,
				value: currentValue,
			}),
			[collapsible, currentValue, finalNoStyle, setCurrentValue, type]
		);

		return (
			<AccordionContext.Provider value={contextValue}>
				<div
					ref={forwardedRef}
					className={rootClassName}
					data-slot="accordion-root"
					{...rest}
				>
					{children}
				</div>
			</AccordionContext.Provider>
		);
	}
);

AccordionRoot.displayName = ACCORDION_ROOT_NAME;

export interface AccordionItemProps extends HTMLAttributes<HTMLDivElement> {
	disabled?: boolean;
	noStyle?: boolean;
	value: string;
}

const AccordionItem = forwardRef<HTMLDivElement, AccordionItemProps>(
	(
		{ children, className, disabled, noStyle, value, ...rest },
		forwardedRef
	) => {
		const { noStyle: contextNoStyle } = useTheme();
		const variants = accordionVariants();
		const accordionContext = useAccordionContext();
		const open = isAccordionItemOpen(
			accordionContext.type,
			accordionContext.value,
			value
		);
		const itemNoStyle = accordionContext.noStyle || contextNoStyle || noStyle;
		const itemClassName = itemNoStyle
			? className
			: variants.item({ class: className });
		const reactId = useId().replace(/:/g, '');
		const contentId = `c15t-accordion-content-${reactId}`;
		const triggerId = `c15t-accordion-trigger-${reactId}`;

		return (
			<AccordionItemContext.Provider
				value={{
					contentId,
					disabled,
					open,
					triggerId,
					value,
				}}
			>
				<div
					ref={forwardedRef}
					className={itemClassName}
					data-disabled={getDataDisabled(disabled)}
					data-slot="accordion-item"
					data-state={open ? 'open' : 'closed'}
					{...rest}
				>
					{children}
				</div>
			</AccordionItemContext.Provider>
		);
	}
);

AccordionItem.displayName = ACCORDION_ITEM_NAME;

export interface AccordionHeaderProps extends HTMLAttributes<HTMLDivElement> {}

const AccordionHeader = forwardRef<HTMLDivElement, AccordionHeaderProps>(
	({ children, ...rest }, forwardedRef) => (
		<div ref={forwardedRef} data-slot="accordion-header" {...rest}>
			{children}
		</div>
	)
);

AccordionHeader.displayName = ACCORDION_HEADER_NAME;

export interface AccordionTriggerProps
	extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
	noStyle?: boolean;
}

const AccordionTrigger = forwardRef<HTMLButtonElement, AccordionTriggerProps>(
	({ children, className, noStyle, onClick, ...rest }, forwardedRef) => {
		const { noStyle: contextNoStyle } = useTheme();
		const variants = accordionVariants();
		const accordionContext = useAccordionContext();
		const itemContext = useAccordionItemContext();
		const triggerNoStyle =
			accordionContext.noStyle || contextNoStyle || noStyle;
		const triggerClassName = triggerNoStyle
			? className
			: variants.trigger({ class: className });

		return (
			<button
				ref={forwardedRef}
				aria-controls={itemContext.contentId}
				aria-disabled={itemContext.disabled || undefined}
				aria-expanded={itemContext.open}
				className={triggerClassName}
				data-disabled={getDataDisabled(itemContext.disabled)}
				data-slot="accordion-trigger"
				data-state={itemContext.open ? 'open' : 'closed'}
				disabled={itemContext.disabled}
				id={itemContext.triggerId}
				onClick={(event) => {
					accordionContext.onItemToggle(itemContext.value);
					onClick?.(event);
				}}
				type="button"
				{...rest}
			>
				{children}
			</button>
		);
	}
);

AccordionTrigger.displayName = ACCORDION_TRIGGER_NAME;

export interface AccordionIconBaseProps extends Record<string, unknown> {
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

	return (
		<Component className={iconClassName} data-slot="accordion-icon" {...rest} />
	);
}

AccordionIcon.displayName = ACCORDION_ICON_NAME;

type AccordionArrowProps = HTMLAttributes<HTMLDivElement> & {
	closeIcon?: { Element: ElementType; className?: string };
	noStyle?: boolean;
	openIcon?: { Element: ElementType; className?: string };
};

function AccordionArrow({
	closeIcon = {
		Element: LucideIcon({ title: 'Close', iconPath: <path d="M5 12h14" /> }),
	},
	noStyle,
	openIcon = {
		Element: LucideIcon({
			title: 'Open',
			iconPath: <path d="M5 12h14M12 5v14" />,
		}),
	},
	...rest
}: AccordionArrowProps) {
	const itemContext = useAccordionItemContext();
	const variants = accordionVariants();
	const openClassName = noStyle
		? openIcon.className
		: variants.arrowOpen({ class: openIcon.className });
	const closeClassName = noStyle
		? closeIcon.className
		: variants.arrowClose({ class: closeIcon.className });

	return (
		<span
			data-slot="accordion-arrow"
			style={{
				alignItems: 'center',
				display: 'inline-flex',
				flexShrink: 0,
				height: '1.25rem',
				justifyContent: 'center',
				position: 'relative',
				width: '1.25rem',
			}}
		>
			<openIcon.Element
				aria-hidden="true"
				className={openClassName}
				data-slot="accordion-arrow-open"
				data-state={itemContext.open ? 'open' : 'closed'}
				{...rest}
			/>
			<closeIcon.Element
				aria-hidden="true"
				className={closeClassName}
				data-slot="accordion-arrow-close"
				data-state={itemContext.open ? 'open' : 'closed'}
				{...rest}
			/>
		</span>
	);
}

AccordionArrow.displayName = ACCORDION_ARROW_NAME;

export interface AccordionContentProps extends HTMLAttributes<HTMLElement> {
	innerClassName?: string;
	noStyle?: boolean;
}

const AccordionContent = forwardRef<HTMLElement, AccordionContentProps>(
	({ children, className, innerClassName, noStyle, ...rest }, forwardedRef) => {
		const { noStyle: contextNoStyle } = useTheme();
		const variants = accordionVariants();
		const accordionContext = useAccordionContext();
		const itemContext = useAccordionItemContext();
		const contentNoStyle =
			accordionContext.noStyle || contextNoStyle || noStyle;
		const contentClassName = contentNoStyle
			? className
			: variants.content({ class: className });
		const contentInnerClassName = contentNoStyle
			? innerClassName
			: variants.contentInner({ class: innerClassName });

		return (
			<section
				ref={forwardedRef}
				aria-hidden={!itemContext.open}
				aria-labelledby={itemContext.triggerId}
				className={contentClassName}
				data-slot="accordion-content"
				data-state={itemContext.open ? 'open' : 'closed'}
				id={itemContext.contentId}
				{...rest}
			>
				<div data-slot="accordion-content-viewport">
					<div className={contentInnerClassName}>{children}</div>
				</div>
			</section>
		);
	}
);

AccordionContent.displayName = ACCORDION_CONTENT_NAME;

export {
	AccordionArrow as Arrow,
	AccordionContent as Content,
	AccordionHeader as Header,
	AccordionIcon as Icon,
	AccordionItem as Item,
	AccordionRoot as Root,
	AccordionTrigger as Trigger,
};
