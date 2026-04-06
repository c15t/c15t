'use client';

import { getDataDisabled } from '@c15t/ui/primitives/data-state';
import {
	getPreferenceItemState,
	PREFERENCE_ITEM_INTERNAL_SLOTS,
	PREFERENCE_ITEM_SLOTS,
	togglePreferenceItemValue,
} from '@c15t/ui/primitives/preference-item';
import {
	type PreferenceItemVariantsProps,
	preferenceItemVariants,
} from '@c15t/ui/styles/primitives/preference-item';
import {
	createContext,
	forwardRef,
	type HTMLAttributes,
	type ReactNode,
	useContext,
	useId,
} from 'react';
import { useControllableState } from '~/components/shared/libs/use-controllable-state';
import { useTheme } from '~/hooks/use-theme';

type PreferenceItemContextValue = {
	contentId: string;
	disabled?: boolean;
	noStyle?: boolean;
	open: boolean;
	setOpen: (open: boolean) => void;
	triggerId: string;
};

const PreferenceItemContext = createContext<PreferenceItemContextValue | null>(
	null
);

function usePreferenceItemContext() {
	const context = useContext(PreferenceItemContext);

	if (!context) {
		throw new Error(
			'PreferenceItem components must be used within PreferenceItemRoot'
		);
	}

	return context;
}

export interface PreferenceItemRootProps
	extends HTMLAttributes<HTMLDivElement>,
		PreferenceItemVariantsProps {
	children: ReactNode;
	defaultOpen?: boolean;
	disabled?: boolean;
	noStyle?: boolean;
	onOpenChange?: (open: boolean) => void;
	open?: boolean;
}

const PreferenceItemRoot = forwardRef<HTMLDivElement, PreferenceItemRootProps>(
	(
		{
			children,
			className,
			defaultOpen = false,
			disabled,
			noStyle,
			onOpenChange,
			open,
			...rest
		},
		forwardedRef
	) => {
		const { noStyle: contextNoStyle } = useTheme();
		const variants = preferenceItemVariants();
		const [isOpen, setIsOpen] = useControllableState({
			defaultValue: defaultOpen,
			onChange: onOpenChange,
			value: open,
		});
		const reactId = useId().replace(/:/g, '');
		const finalNoStyle = contextNoStyle || noStyle;

		return (
			<PreferenceItemContext.Provider
				value={{
					contentId: `c15t-preference-item-content-${reactId}`,
					disabled,
					noStyle: finalNoStyle,
					open: isOpen,
					setOpen: setIsOpen,
					triggerId: `c15t-preference-item-trigger-${reactId}`,
				}}
			>
				<div
					ref={forwardedRef}
					className={
						finalNoStyle ? className : variants.root({ class: className })
					}
					data-disabled={getDataDisabled(disabled)}
					data-slot={PREFERENCE_ITEM_SLOTS.root}
					data-state={getPreferenceItemState(isOpen)}
					{...rest}
				>
					{children}
				</div>
			</PreferenceItemContext.Provider>
		);
	}
);

PreferenceItemRoot.displayName = 'PreferenceItemRoot';

export interface PreferenceItemTriggerProps
	extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
	noStyle?: boolean;
}

const PreferenceItemTrigger = forwardRef<
	HTMLButtonElement,
	PreferenceItemTriggerProps
>(({ children, className, noStyle, onClick, ...rest }, forwardedRef) => {
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
	const finalNoStyle = rootNoStyle || contextNoStyle || noStyle;

	return (
		<button
			ref={forwardedRef}
			aria-controls={contentId}
			aria-disabled={disabled || undefined}
			aria-expanded={open}
			className={
				finalNoStyle ? className : variants.trigger({ class: className })
			}
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
			{...rest}
		>
			{children}
		</button>
	);
});

PreferenceItemTrigger.displayName = 'PreferenceItemTrigger';

export interface PreferenceItemSlotProps
	extends HTMLAttributes<HTMLDivElement> {
	noStyle?: boolean;
}

function createSlotComponent(
	displayName: string,
	slot: (typeof PREFERENCE_ITEM_SLOTS)[keyof typeof PREFERENCE_ITEM_SLOTS],
	variantKey: 'leading' | 'header' | 'meta' | 'auxiliary' | 'control'
) {
	const Component = forwardRef<HTMLDivElement, PreferenceItemSlotProps>(
		({ className, noStyle, ...rest }, forwardedRef) => {
			const { noStyle: contextNoStyle } = useTheme();
			const { noStyle: rootNoStyle } = usePreferenceItemContext();
			const variants = preferenceItemVariants();
			const finalNoStyle = rootNoStyle || contextNoStyle || noStyle;

			return (
				<div
					ref={forwardedRef}
					className={
						finalNoStyle
							? className
							: variants[variantKey]({ class: className })
					}
					data-slot={slot}
					{...rest}
				/>
			);
		}
	);

	Component.displayName = displayName;
	return Component;
}

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

export interface PreferenceItemTitleProps
	extends HTMLAttributes<HTMLHeadingElement> {
	noStyle?: boolean;
}

const PreferenceItemTitle = forwardRef<
	HTMLHeadingElement,
	PreferenceItemTitleProps
>(({ className, noStyle, ...rest }, forwardedRef) => {
	const { noStyle: contextNoStyle } = useTheme();
	const { noStyle: rootNoStyle } = usePreferenceItemContext();
	const variants = preferenceItemVariants();
	const finalNoStyle = rootNoStyle || contextNoStyle || noStyle;

	return (
		<h3
			ref={forwardedRef}
			className={
				finalNoStyle ? className : variants.title({ class: className })
			}
			data-slot={PREFERENCE_ITEM_SLOTS.title}
			{...rest}
		/>
	);
});

PreferenceItemTitle.displayName = 'PreferenceItemTitle';

export interface PreferenceItemContentProps
	extends HTMLAttributes<HTMLDivElement> {
	innerClassName?: string;
	noStyle?: boolean;
}

const PreferenceItemContent = forwardRef<
	HTMLDivElement,
	PreferenceItemContentProps
>(({ children, className, innerClassName, noStyle, ...rest }, forwardedRef) => {
	const { noStyle: contextNoStyle } = useTheme();
	const variants = preferenceItemVariants();
	const {
		contentId,
		noStyle: rootNoStyle,
		open,
		triggerId,
	} = usePreferenceItemContext();
	const finalNoStyle = rootNoStyle || contextNoStyle || noStyle;

	return (
		<div
			ref={forwardedRef}
			aria-hidden={!open}
			aria-labelledby={triggerId}
			className={variants.content({
				class: finalNoStyle ? className : className,
			})}
			data-slot={PREFERENCE_ITEM_SLOTS.content}
			data-state={getPreferenceItemState(open)}
			id={contentId}
			inert={!open}
			{...rest}
		>
			<div
				className={variants.contentViewport()}
				data-slot={PREFERENCE_ITEM_INTERNAL_SLOTS.contentViewport}
			>
				<div
					className={variants.contentInner({ class: innerClassName })}
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
