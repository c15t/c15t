'use client';

import styles from '@c15t/ui/styles/primitives/accordion.module.css';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import {
	type ComponentPropsWithoutRef,
	type ComponentRef,
	type ElementType,
	forwardRef,
	type HTMLAttributes,
} from 'react';
import type { PolymorphicComponentProps } from '~/components/shared/libs/polymorphic';
import { Box } from '~/components/shared/primitives/box';
import { LucideIcon } from '~/components/shared/ui/icon';
import { useStyles } from '~/hooks/use-styles';
import { useTheme } from '~/hooks/use-theme';
import type { AllThemeKeys, ExtendThemeKeys, ThemeValue } from '~/types/theme';

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

const AccordionRoot = forwardRef<
	ComponentRef<typeof AccordionPrimitive.Root>,
	ComponentPropsWithoutRef<typeof AccordionPrimitive.Root> & ExtendThemeKeys
>(
	(
		{
			className,
			themeKey = 'accordion.root',
			baseClassName,
			noStyle,
			style,
			...rest
		},
		forwardedRef
	) => {
		const { noStyle: contextNoStyle } = useTheme();

		const accordionStyle = useStyles((themeKey as any) ?? 'widgetAccordion', {
			baseClassName: [baseClassName, styles.root],
			className,
			noStyle: contextNoStyle || noStyle,
			style,
		});

		return (
			<AccordionPrimitive.Root
				ref={forwardedRef}
				{...rest}
				{...accordionStyle}
			/>
		);
	}
);

AccordionRoot.displayName = ACCORDION_ROOT_NAME;

const AccordionItem = forwardRef<
	ComponentRef<typeof AccordionPrimitive.Item>,
	ComponentPropsWithoutRef<typeof AccordionPrimitive.Item> & ExtendThemeKeys
>(
	(
		{ className, themeKey, baseClassName, noStyle, style, ...rest },
		forwardedRef
	) => {
		const { noStyle: contextNoStyle } = useTheme();

		const accordionItemStyle = useStyles(
			(themeKey as any) ?? 'widgetAccordion',
			{
				baseClassName: [baseClassName, styles.item],
				className,
				noStyle: contextNoStyle || noStyle,
				style,
			}
		);
		return (
			<AccordionPrimitive.Item
				ref={forwardedRef}
				{...rest}
				{...accordionItemStyle}
			/>
		);
	}
);
AccordionItem.displayName = ACCORDION_ITEM_NAME;

const AccordionTrigger = forwardRef<
	ComponentRef<typeof AccordionPrimitive.Trigger>,
	ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger> & ExtendThemeKeys
>(
	(
		{ children, className, themeKey, baseClassName, noStyle, style, ...rest },
		forwardedRef
	) => {
		const { noStyle: contextNoStyle } = useTheme();

		const accordionTriggerStyle = useStyles(
			(themeKey as any) ?? 'widgetAccordion',
			{
				baseClassName: [baseClassName, styles.triggerInner],
				className,
				noStyle: contextNoStyle || noStyle,
				style,
			}
		);

		return (
			<AccordionPrimitive.Trigger
				ref={forwardedRef}
				{...rest}
				{...accordionTriggerStyle}
			>
				{children}
			</AccordionPrimitive.Trigger>
		);
	}
);
AccordionTrigger.displayName = ACCORDION_TRIGGER_NAME;

function AccordionIcon<T extends ElementType>({
	className,
	themeKey,
	baseClassName,
	noStyle,
	style,
	as,
	...rest
}: PolymorphicComponentProps<T> & ExtendThemeKeys) {
	const accordionIconStyle = useStyles((themeKey as any) ?? 'widgetAccordion', {
		baseClassName: [baseClassName, styles.icon],
		className,
		noStyle,
		style,
	});

	const Component = as || 'div';

	return <Component {...rest} {...accordionIconStyle} />;
}
AccordionIcon.displayName = ACCORDION_ICON_NAME;

type AccordionArrowProps = HTMLAttributes<HTMLDivElement> & {
	openIcon?: { Element: ElementType; themeKey: AllThemeKeys } & ExtendThemeKeys;
	closeIcon?: {
		Element: ElementType;
		themeKey: AllThemeKeys;
	} & ExtendThemeKeys;
};

// open/close
function AccordionArrow({
	openIcon = {
		Element: LucideIcon({
			title: 'Open',
			iconPath: <path d="M5 12h14M12 5v14" />,
		}),
		themeKey: 'widgetAccordion' as any,
	},
	closeIcon = {
		Element: LucideIcon({ title: 'Close', iconPath: <path d="M5 12h14" /> }),
		themeKey: 'widgetAccordion' as any,
	},
	...rest
}: AccordionArrowProps) {
	const accordionArrowOpenStyle = useStyles(openIcon.themeKey, {
		baseClassName: [openIcon.baseClassName, styles.arrowOpen],
		className: openIcon.className,
		noStyle: openIcon.noStyle,
		style: openIcon.style,
	});
	const accordionArrowClosedStyle = useStyles(closeIcon.themeKey, {
		baseClassName: [closeIcon.baseClassName, styles.arrowClose],
		className: closeIcon.className,
		noStyle: closeIcon.noStyle,
		style: closeIcon.style,
	});

	return (
		<>
			<openIcon.Element {...rest} {...accordionArrowOpenStyle} />
			<closeIcon.Element {...rest} {...accordionArrowClosedStyle} />
		</>
	);
}
AccordionArrow.displayName = ACCORDION_ARROW_NAME;

const AccordionContent = forwardRef<
	ComponentRef<typeof AccordionPrimitive.Content>,
	ComponentPropsWithoutRef<typeof AccordionPrimitive.Content> & {
		theme: { content: ExtendThemeKeys; contentInner: ExtendThemeKeys };
	}
>(({ children, className, theme, ...rest }, forwardedRef) => {
	const { noStyle: contextNoStyle } = useTheme();

	const accordionContentStyle = useStyles(
		(theme?.content?.themeKey as any) ?? 'widgetAccordion',
		{
			baseClassName: [theme?.content?.baseClassName, styles.content],
			className,
			noStyle: theme?.content?.noStyle || contextNoStyle,
			style: theme?.content?.style,
		}
	);

	return (
		<AccordionPrimitive.Content
			ref={forwardedRef}
			{...rest}
			{...accordionContentStyle}
		>
			<Box
				{...{
					...theme?.contentInner,
					baseClassName: [theme?.content?.baseClassName, styles.contentInner],
					themeKey: (theme?.contentInner?.themeKey as any) ?? 'widgetAccordion',
				}}
			>
				{children}
			</Box>
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
