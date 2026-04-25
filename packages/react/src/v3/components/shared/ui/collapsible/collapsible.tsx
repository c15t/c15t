'use client';

import {
	getCollapsibleState,
	toggleCollapsibleValue,
} from '@c15t/ui/primitives/collapsible';
import { getDataDisabled } from '@c15t/ui/primitives/data-state';
import { collapsibleVariants } from '@c15t/ui/styles/primitives/collapsible';
import {
	type ButtonHTMLAttributes,
	createContext,
	forwardRef,
	type HTMLAttributes,
	type ReactNode,
	useContext,
	useId,
} from 'react';
import { useTheme } from '~/hooks/use-theme';
import { useControllableState } from '~/v3/components/shared/libs/use-controllable-state';

type CollapsibleContextValue = {
	contentId: string;
	disabled?: boolean;
	open: boolean;
	setOpen: (open: boolean) => void;
	triggerId: string;
	noStyle?: boolean;
};

const CollapsibleContext = createContext<CollapsibleContextValue | null>(null);

function useCollapsibleContext() {
	const context = useContext(CollapsibleContext);

	if (!context) {
		throw new Error(
			'Collapsible components must be used within CollapsibleRoot'
		);
	}

	return context;
}

export interface CollapsibleRootProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode;
	defaultOpen?: boolean;
	disabled?: boolean;
	noStyle?: boolean;
	onOpenChange?: (open: boolean) => void;
	open?: boolean;
}

const CollapsibleRoot = forwardRef<HTMLDivElement, CollapsibleRootProps>(
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
		const reactId = useId().replace(/:/g, '');
		const { noStyle: contextNoStyle } = useTheme();
		const variants = collapsibleVariants();
		const [isOpen, setIsOpen] = useControllableState({
			defaultValue: defaultOpen,
			onChange: onOpenChange,
			value: open,
		});
		const finalNoStyle = contextNoStyle || noStyle;

		return (
			<CollapsibleContext.Provider
				value={{
					contentId: `c15t-collapsible-content-${reactId}`,
					disabled,
					noStyle: finalNoStyle,
					open: isOpen,
					setOpen: setIsOpen,
					triggerId: `c15t-collapsible-trigger-${reactId}`,
				}}
			>
				<div
					ref={forwardedRef}
					className={
						finalNoStyle ? className : variants.root({ class: className })
					}
					data-disabled={getDataDisabled(disabled)}
					data-slot="collapsible-root"
					data-state={getCollapsibleState(isOpen)}
					{...rest}
				>
					{children}
				</div>
			</CollapsibleContext.Provider>
		);
	}
);

CollapsibleRoot.displayName = 'CollapsibleRoot';

export interface CollapsibleTriggerProps
	extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
	noStyle?: boolean;
}

const CollapsibleTrigger = forwardRef<
	HTMLButtonElement,
	CollapsibleTriggerProps
>(({ children, className, noStyle, onClick, ...rest }, forwardedRef) => {
	const { noStyle: contextNoStyle } = useTheme();
	const variants = collapsibleVariants();
	const {
		contentId,
		disabled,
		noStyle: rootNoStyle,
		open,
		setOpen,
		triggerId,
	} = useCollapsibleContext();
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
			data-slot="collapsible-trigger"
			data-state={getCollapsibleState(open)}
			disabled={disabled}
			id={triggerId}
			onClick={(event) => {
				if (!disabled) {
					setOpen(toggleCollapsibleValue(open));
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

CollapsibleTrigger.displayName = 'CollapsibleTrigger';

export interface CollapsibleContentProps
	extends HTMLAttributes<HTMLDivElement> {
	innerClassName?: string;
	noStyle?: boolean;
}

const CollapsibleContent = forwardRef<HTMLDivElement, CollapsibleContentProps>(
	({ children, className, innerClassName, noStyle, ...rest }, forwardedRef) => {
		const { noStyle: contextNoStyle } = useTheme();
		const variants = collapsibleVariants();
		const {
			contentId,
			noStyle: rootNoStyle,
			open,
			triggerId,
		} = useCollapsibleContext();
		const finalNoStyle = rootNoStyle || contextNoStyle || noStyle;

		return (
			<div
				ref={forwardedRef}
				aria-hidden={!open}
				aria-labelledby={triggerId}
				className={variants.content({ class: className })}
				data-slot="collapsible-content"
				data-state={getCollapsibleState(open)}
				id={contentId}
				inert={!open}
				{...rest}
			>
				<div
					className={variants.contentViewport({ class: undefined })}
					data-slot="collapsible-content-viewport"
				>
					<div className={variants.contentInner({ class: innerClassName })}>
						{children}
					</div>
				</div>
			</div>
		);
	}
);

CollapsibleContent.displayName = 'CollapsibleContent';

export {
	CollapsibleContent as Content,
	CollapsibleRoot as Root,
	CollapsibleTrigger as Trigger,
};
