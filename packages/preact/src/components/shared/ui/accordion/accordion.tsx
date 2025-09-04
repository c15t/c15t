'use client';

import type { JSX } from 'preact';
import { useId, useState } from 'preact/compat';
import { forwardRef } from 'preact/compat';

import { Box } from '~/components/shared/primitives/box';
import { LucideIcon } from '~/components/shared/ui/icon';
import { useStyles } from '~/hooks/use-styles';
import { useTheme } from '~/hooks/use-theme';
import type { AllThemeKeys, ExtendThemeKeys, ThemeValue } from '~/types/theme';
import styles from './accordion.module.css';

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

type AccordionRootProps = {
	/** single (radio) or multiple (checkbox-like) */
	type?: 'single' | 'multiple';
	value?: string[];
	onValueChange?: (val: string[]) => void;
} & JSX.HTMLAttributes<HTMLDivElement> &
	ExtendThemeKeys;

const AccordionRoot = forwardRef<HTMLDivElement, AccordionRootProps>(
	(
		{
			type = 'single',
			value,
			onValueChange,
			children,
			className,
			themeKey,
			baseClassName,
			noStyle,
			style,
			...rest
		},
		ref
	) => {
		const { noStyle: ctxNoStyle } = useTheme();
		const [internal, setInternal] = useState<string[]>([]);

		const openValues = value ?? internal;

		const toggle = (val: string) => {
			let newVals: string[];
			if (type === 'single') {
				newVals = openValues.includes(val) ? [] : [val];
			} else {
				newVals = openValues.includes(val)
					? openValues.filter((v) => v !== val)
					: [...openValues, val];
			}
			onValueChange?.(newVals);
			if (!value) setInternal(newVals);
		};

		const accordionStyle = useStyles(themeKey ?? 'accordion.root', {
			baseClassName: [baseClassName, styles.root],
			className,
			noStyle: ctxNoStyle || noStyle,
			style,
		});

		return (
			<div ref={ref} {...accordionStyle} {...rest} data-accordion-root>
				{children &&
					// inject toggle + state via context-like prop drilling
					(Array.isArray(children)
						? children.map((c) =>
								typeof c === 'object' && c && 'props' in c
									? {
											...c,
											props: {
												...c.props,
												__accordionToggle: toggle,
												__accordionOpen: openValues,
											},
										}
									: c
							)
						: children)}
			</div>
		);
	}
);
AccordionRoot.displayName = 'AccordionRoot';

type AccordionItemProps = {
	value: string;
	__accordionToggle?: (val: string) => void;
	__accordionOpen?: string[];
} & JSX.HTMLAttributes<HTMLDivElement> &
	ExtendThemeKeys;

const AccordionItem = forwardRef<HTMLDivElement, AccordionItemProps>(
	(
		{
			value,
			children,
			__accordionToggle,
			__accordionOpen,
			className,
			themeKey,
			baseClassName,
			noStyle,
			style,
			...rest
		},
		ref
	) => {
		const { noStyle: ctxNoStyle } = useTheme();
		const isOpen = __accordionOpen?.includes(value) ?? false;

		const accordionItemStyle = useStyles(themeKey ?? 'accordion.item', {
			baseClassName: [baseClassName, styles.item],
			className,
			noStyle: ctxNoStyle || noStyle,
			style,
		});

		return (
			<div
				ref={ref}
				{...accordionItemStyle}
				{...rest}
				data-accordion-item
				data-open={isOpen}
			>
				{/* propagate toggle + open down to children */}
				{Array.isArray(children)
					? children.map((c) =>
							typeof c === 'object' && c && 'props' in c
								? {
										...c,
										props: {
											...c.props,
											__accordionToggle,
											__accordionOpen,
											value,
										},
									}
								: c
						)
					: children}
			</div>
		);
	}
);
AccordionItem.displayName = 'AccordionItem';

type AccordionTriggerProps = {
	value?: string;
	__accordionToggle?: (val: string) => void;
	__accordionOpen?: string[];
} & JSX.HTMLAttributes<HTMLButtonElement> &
	ExtendThemeKeys;

const AccordionTrigger = forwardRef<HTMLButtonElement, AccordionTriggerProps>(
	(
		{
			children,
			value,
			__accordionToggle,
			__accordionOpen,
			className,
			themeKey,
			baseClassName,
			noStyle,
			style,
			...rest
		},
		ref
	) => {
		const { noStyle: ctxNoStyle } = useTheme();
		const id = useId();
		const isOpen = value ? (__accordionOpen?.includes(value) ?? false) : false;

		const accordionTriggerStyle = useStyles(themeKey ?? 'accordion.trigger', {
			baseClassName: [baseClassName, styles.triggerInner],
			className,
			noStyle: ctxNoStyle || noStyle,
			style,
		});

		return (
			<button
				ref={ref}
				{...accordionTriggerStyle}
				{...rest}
				aria-expanded={isOpen}
				aria-controls={`accordion-content-${id}`}
				onClick={() => value && __accordionToggle?.(value)}
			>
				{children}
			</button>
		);
	}
);
AccordionTrigger.displayName = 'AccordionTrigger';

function AccordionIcon({
	className,
	themeKey,
	baseClassName,
	noStyle,
	style,
	as: Comp = 'div',
	...rest
}: any) {
	const iconStyle = useStyles(themeKey ?? 'accordion.icon', {
		baseClassName: [baseClassName, styles.icon],
		className,
		noStyle,
		style,
	});
	return <Comp {...rest} {...iconStyle} />;
}
AccordionIcon.displayName = 'AccordionIcon';

type AccordionArrowProps = {
	openIcon?: { Element: any; themeKey: AllThemeKeys } & ExtendThemeKeys;
	closeIcon?: { Element: any; themeKey: AllThemeKeys } & ExtendThemeKeys;
} & JSX.HTMLAttributes<HTMLDivElement>;

function AccordionArrow({
	openIcon = {
		Element: LucideIcon({
			title: 'Open',
			iconPath: <path d="M5 12h14M12 5v14" />,
		}),
		themeKey: 'accordion.arrow.open',
	},
	closeIcon = {
		Element: LucideIcon({ title: 'Close', iconPath: <path d="M5 12h14" /> }),
		themeKey: 'accordion.arrow.close',
	},
	...rest
}: AccordionArrowProps) {
	const openStyle = useStyles(openIcon.themeKey, {
		baseClassName: [openIcon.baseClassName, styles.arrowOpen],
		className: openIcon.className,
		noStyle: openIcon.noStyle,
		style: openIcon.style,
	});
	const closedStyle = useStyles(closeIcon.themeKey, {
		baseClassName: [closeIcon.baseClassName, styles.arrowClose],
		className: closeIcon.className,
		noStyle: closeIcon.noStyle,
		style: closeIcon.style,
	});

	return (
		<>
			<openIcon.Element {...rest} {...openStyle} />
			<closeIcon.Element {...rest} {...closedStyle} />
		</>
	);
}
AccordionArrow.displayName = 'AccordionArrow';

type AccordionContentProps = {
	value?: string;
	__accordionOpen?: string[];
	theme: { content: ExtendThemeKeys; contentInner: ExtendThemeKeys };
} & JSX.HTMLAttributes<HTMLDivElement>;

const AccordionContent = forwardRef<HTMLDivElement, AccordionContentProps>(
	({ children, value, __accordionOpen, className, theme, ...rest }, ref) => {
		const { noStyle: ctxNoStyle } = useTheme();
		const isOpen = value ? (__accordionOpen?.includes(value) ?? false) : false;

		const contentStyle = useStyles(
			theme?.content?.themeKey ?? 'accordion.content',
			{
				baseClassName: [theme?.content?.baseClassName, styles.content],
				className: className?.toString(),
				noStyle: theme?.content?.noStyle || ctxNoStyle,
				style: theme?.content?.style,
			}
		);

		return (
			<div
				ref={ref}
				{...rest}
				{...contentStyle}
				hidden={!isOpen}
				id={`accordion-content-${value}`}
				role="region"
			>
				<Box
					{...{
						...theme?.contentInner,
						baseClassName: [theme?.content?.baseClassName, styles.contentInner],
						themeKey:
							theme?.contentInner?.themeKey ?? 'accordion.content-inner',
					}}
				>
					{children}
				</Box>
			</div>
		);
	}
);
AccordionContent.displayName = 'AccordionContent';

export {
	AccordionRoot as Root,
	AccordionItem as Item,
	AccordionTrigger as Trigger,
	AccordionIcon as Icon,
	AccordionArrow as Arrow,
	AccordionContent as Content,
};
