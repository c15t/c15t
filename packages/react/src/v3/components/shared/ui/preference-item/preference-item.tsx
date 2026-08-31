'use client';

import type { ConsentComponentSlotKey } from '@c15t/schema/config';
import { getDataDisabled } from '@c15t/ui/primitives/data-state';
import {
	getPreferenceItemState,
	PREFERENCE_ITEM_INTERNAL_SLOTS,
	PREFERENCE_ITEM_SLOTS,
	togglePreferenceItemValue,
} from '@c15t/ui/primitives/preference-item';
import styles from '@c15t/ui/styles/v3/preference-item';
import { createContext, forwardRef, useContext, useId, useMemo } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';

import { useControllableState } from '~/v3/components/shared/libs/use-controllable-state';
import { useTheme } from '~/v3/hooks/use-theme';
import { useUIConfig } from '~/v3/ui-config-context';
import { getSlotProps, mergeSlotProps } from '~/v3/utils/merge-slot-props';

export type PreferenceItemVariantsProps = Record<never, never>;

export const preferenceItemVariants = () => ({
	auxiliary: (options?: { class?: string }) =>
		[styles.auxiliary, options?.class].filter(Boolean).join(' '),
	content: (options?: { class?: string }) =>
		[styles.content, options?.class].filter(Boolean).join(' '),
	contentInner: (options?: { class?: string }) =>
		[styles.contentInner, options?.class].filter(Boolean).join(' '),
	contentViewport: (options?: { class?: string }) =>
		[styles.contentViewport, options?.class].filter(Boolean).join(' '),
	control: (options?: { class?: string }) =>
		[styles.control, options?.class].filter(Boolean).join(' '),
	header: (options?: { class?: string }) =>
		[styles.header, options?.class].filter(Boolean).join(' '),
	leading: (options?: { class?: string }) =>
		[styles.leading, options?.class].filter(Boolean).join(' '),
	meta: (options?: { class?: string }) =>
		[styles.meta, options?.class].filter(Boolean).join(' '),
	root: (options?: { class?: string }) =>
		[styles.root, options?.class].filter(Boolean).join(' '),
	title: (options?: { class?: string }) =>
		[styles.title, options?.class].filter(Boolean).join(' '),
	trigger: (options?: { class?: string }) =>
		[styles.trigger, options?.class].filter(Boolean).join(' '),
});

interface PreferenceItemContextValue {
	contentId: string;
	disabled?: boolean;
	noStyle?: boolean;
	open: boolean;
	setOpen: (open: boolean) => void;
	triggerId: string;
}

const PreferenceItemContext = createContext<PreferenceItemContextValue | null>(
	null
);

const usePreferenceItemContext = function usePreferenceItemContext() {
	const context = useContext(PreferenceItemContext);

	if (!context) {
		throw new Error(
			'PreferenceItem components must be used within PreferenceItemRoot'
		);
	}

	return context;
};

export interface PreferenceItemRootProps
	extends HTMLAttributes<HTMLDivElement>, PreferenceItemVariantsProps {
	children: ReactNode;
	defaultOpen?: boolean;
	disabled?: boolean;
	noStyle?: boolean;
	onOpenChange?: (open: boolean) => void;
	open?: boolean;
	slotKey?: ConsentComponentSlotKey;
}

const PreferenceItemRoot = forwardRef<HTMLDivElement, PreferenceItemRootProps>(
	function (
		{
			children,
			className,
			defaultOpen = false,
			disabled,
			noStyle,
			onOpenChange,
			open,
			slotKey,
			...rest
		},
		forwardedRef
	) {
		const { components } = useUIConfig();
		const { noStyle: contextNoStyle } = useTheme();
		const variants = preferenceItemVariants();
		const [isOpen, setIsOpen] = useControllableState({
			defaultValue: defaultOpen,
			onChange: onOpenChange,
			value: open,
		});
		const reactId = useId().replace(/:/gu, '');
		const finalNoStyle = noStyle ?? contextNoStyle;
		const rootProps = mergeSlotProps(getSlotProps(components, slotKey), {
			baseClassName: variants.root(),
			className,
			noStyle: finalNoStyle,
			...rest,
		});
		const contextValue = useMemo(
			() => ({
				contentId: `c15t-preference-item-content-${reactId}`,
				disabled,
				noStyle: finalNoStyle,
				open: isOpen,
				setOpen: setIsOpen,
				triggerId: `c15t-preference-item-trigger-${reactId}`,
			}),
			[disabled, finalNoStyle, isOpen, reactId, setIsOpen]
		);

		return (
			<PreferenceItemContext.Provider value={contextValue}>
				<div
					{...rootProps}
					ref={forwardedRef}
					data-disabled={getDataDisabled(disabled)}
					data-slot={PREFERENCE_ITEM_SLOTS.root}
					data-state={getPreferenceItemState(isOpen)}
				>
					{children}
				</div>
			</PreferenceItemContext.Provider>
		);
	}
);

PreferenceItemRoot.displayName = 'PreferenceItemRoot';

export interface PreferenceItemTriggerProps extends Omit<
	React.ButtonHTMLAttributes<HTMLButtonElement>,
	'type'
> {
	noStyle?: boolean;
	slotKey?: ConsentComponentSlotKey;
}

const PreferenceItemTrigger = forwardRef<
	HTMLButtonElement,
	PreferenceItemTriggerProps
>(function (
	{ children, className, noStyle, onClick, slotKey, ...rest },
	forwardedRef
) {
	const { components } = useUIConfig();
	const { noStyle: contextNoStyle } = useTheme();
	const variants = preferenceItemVariants();
	const {
		contentId,
		disabled,
		noStyle: rootNoStyle,
		open,
		setOpen,
		triggerId,
	} = usePreferenceItemContext();
	const finalNoStyle = noStyle ?? rootNoStyle ?? contextNoStyle;
	const triggerProps = mergeSlotProps(getSlotProps(components, slotKey), {
		baseClassName: variants.trigger(),
		className,
		noStyle: finalNoStyle,
		...rest,
	});

	return (
		<button
			{...triggerProps}
			ref={forwardedRef}
			aria-controls={contentId}
			aria-disabled={disabled || undefined}
			aria-expanded={open}
			data-disabled={getDataDisabled(disabled)}
			data-slot={PREFERENCE_ITEM_SLOTS.trigger}
			data-state={getPreferenceItemState(open)}
			disabled={disabled}
			id={triggerId}
			onClick={(event) => {
				if (!disabled) {
					setOpen(togglePreferenceItemValue(open));
				}
				onClick?.(event);
			}}
			type="button"
		>
			{children}
		</button>
	);
});

PreferenceItemTrigger.displayName = 'PreferenceItemTrigger';

export interface PreferenceItemSlotProps extends HTMLAttributes<HTMLDivElement> {
	noStyle?: boolean;
	slotKey?: ConsentComponentSlotKey;
}

const createSlotComponent = function createSlotComponent(
	displayName: string,
	slot: (typeof PREFERENCE_ITEM_SLOTS)[keyof typeof PREFERENCE_ITEM_SLOTS],
	variantKey: 'leading' | 'header' | 'meta' | 'auxiliary' | 'control'
) {
	const Component = forwardRef<HTMLDivElement, PreferenceItemSlotProps>(
		function ({ className, noStyle, slotKey, ...rest }, forwardedRef) {
			const { components } = useUIConfig();
			const { noStyle: contextNoStyle } = useTheme();
			const { noStyle: rootNoStyle } = usePreferenceItemContext();
			const variants = preferenceItemVariants();
			const finalNoStyle = noStyle ?? rootNoStyle ?? contextNoStyle;
			const slotProps = mergeSlotProps(getSlotProps(components, slotKey), {
				baseClassName: variants[variantKey](),
				className,
				noStyle: finalNoStyle,
				...rest,
			});

			return (
				<div
					{...slotProps}
					ref={forwardedRef}
					data-slot={slot}
				/>
			);
		}
	);

	Component.displayName = displayName;
	return Component;
};

const PreferenceItemLeading = createSlotComponent(
	'PreferenceItemLeading',
	PREFERENCE_ITEM_SLOTS.leading,
	'leading'
);

const PreferenceItemHeader = createSlotComponent(
	'PreferenceItemHeader',
	PREFERENCE_ITEM_SLOTS.header,
	'header'
);

const PreferenceItemMeta = createSlotComponent(
	'PreferenceItemMeta',
	PREFERENCE_ITEM_SLOTS.meta,
	'meta'
);

const PreferenceItemAuxiliary = createSlotComponent(
	'PreferenceItemAuxiliary',
	PREFERENCE_ITEM_SLOTS.auxiliary,
	'auxiliary'
);

const PreferenceItemControl = createSlotComponent(
	'PreferenceItemControl',
	PREFERENCE_ITEM_SLOTS.control,
	'control'
);

export interface PreferenceItemTitleProps extends HTMLAttributes<HTMLHeadingElement> {
	noStyle?: boolean;
	slotKey?: ConsentComponentSlotKey;
}

const PreferenceItemTitle = forwardRef<
	HTMLHeadingElement,
	PreferenceItemTitleProps
>(function ({ children, className, noStyle, ...rest }, forwardedRef) {
	const { components } = useUIConfig();
	const { noStyle: contextNoStyle } = useTheme();
	const { noStyle: rootNoStyle } = usePreferenceItemContext();
	const variants = preferenceItemVariants();
	const finalNoStyle = noStyle ?? rootNoStyle ?? contextNoStyle;
	const { slotKey, ...ownRest } = rest;
	const titleProps = mergeSlotProps(getSlotProps(components, slotKey), {
		baseClassName: variants.title(),
		className,
		noStyle: finalNoStyle,
		...ownRest,
	});

	return (
		<h3
			{...titleProps}
			ref={forwardedRef}
			data-slot={PREFERENCE_ITEM_SLOTS.title}
		>
			{children}
		</h3>
	);
});

PreferenceItemTitle.displayName = 'PreferenceItemTitle';

export interface PreferenceItemContentProps extends HTMLAttributes<HTMLDivElement> {
	innerClassName?: string;
	innerSlotKey?: ConsentComponentSlotKey;
	noStyle?: boolean;
	slotKey?: ConsentComponentSlotKey;
	viewportClassName?: string;
	viewportSlotKey?: ConsentComponentSlotKey;
}

const PreferenceItemContent = forwardRef<
	HTMLDivElement,
	PreferenceItemContentProps
>(function (
	{
		children,
		className,
		innerClassName,
		innerSlotKey,
		noStyle,
		slotKey,
		viewportClassName,
		viewportSlotKey,
		...rest
	},
	forwardedRef
) {
	const { components } = useUIConfig();
	const { noStyle: contextNoStyle } = useTheme();
	const variants = preferenceItemVariants();
	const {
		contentId,
		noStyle: rootNoStyle,
		open,
		triggerId,
	} = usePreferenceItemContext();
	const finalNoStyle = noStyle ?? rootNoStyle ?? contextNoStyle;
	const contentProps = mergeSlotProps(getSlotProps(components, slotKey), {
		baseClassName: variants.content(),
		className,
		noStyle: finalNoStyle,
		...rest,
	});
	const viewportProps = mergeSlotProps(
		getSlotProps(components, viewportSlotKey),
		{
			baseClassName: variants.contentViewport(),
			className: viewportClassName,
			noStyle: finalNoStyle,
		}
	);
	const innerProps = mergeSlotProps(getSlotProps(components, innerSlotKey), {
		baseClassName: variants.contentInner(),
		className: innerClassName,
		noStyle: finalNoStyle,
	});

	return (
		<div
			{...contentProps}
			ref={forwardedRef}
			aria-hidden={!open}
			aria-labelledby={triggerId}
			data-slot={PREFERENCE_ITEM_SLOTS.content}
			data-state={getPreferenceItemState(open)}
			id={contentId}
			inert={!open}
		>
			<div
				{...viewportProps}
				data-slot={PREFERENCE_ITEM_INTERNAL_SLOTS.contentViewport}
			>
				<div
					{...innerProps}
					data-slot={PREFERENCE_ITEM_INTERNAL_SLOTS.contentInner}
				>
					{children}
				</div>
			</div>
		</div>
	);
});

PreferenceItemContent.displayName = 'PreferenceItemContent';

export {
	PreferenceItemAuxiliary as Auxiliary,
	PreferenceItemContent as Content,
	PreferenceItemControl as Control,
	PreferenceItemHeader as Header,
	PreferenceItemLeading as Leading,
	PreferenceItemMeta as Meta,
	PreferenceItemRoot as Root,
	PreferenceItemTitle as Title,
	PreferenceItemTrigger as Trigger,
};
