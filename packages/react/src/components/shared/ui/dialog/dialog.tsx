'use client';

import { getDataDisabled } from '@c15t/ui/primitives/data-state';
import { getDialogState, isDialogDismissKey } from '@c15t/ui/primitives/dialog';
import {
	createContext,
	forwardRef,
	useContext,
	useEffect,
	useId,
	useMemo,
	useRef,
} from 'react';
import type {
	ButtonHTMLAttributes,
	HTMLAttributes,
	KeyboardEvent,
	MouseEvent,
	ReactNode,
	RefObject,
} from 'react';
import { createPortal } from 'react-dom';

import { Slot } from '~/components/shared/libs/slot';
import { useControllableState } from '~/components/shared/libs/use-controllable-state';
import { useFocusTrap } from '~/hooks/use-focus-trap';
import { useScrollLock } from '~/hooks/use-scroll-lock';

interface DialogContextValue {
	contentId: string;
	descriptionId: string;
	open: boolean;
	restoreFocusRef: RefObject<HTMLElement | null>;
	setOpen: (open: boolean) => void;
	titleId: string;
}

const DialogContext = createContext<DialogContextValue | null>(null);

const useDialogContext = function useDialogContext() {
	const context = useContext(DialogContext);

	if (!context) {
		throw new Error('Dialog components must be used within DialogRoot');
	}

	return context;
};

export interface DialogRootProps {
	children: ReactNode;
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
	open?: boolean;
}

const DialogRoot = ({
	children,
	defaultOpen = false,
	onOpenChange,
	open,
}: DialogRootProps) => {
	const reactId = useId().replace(/:/gu, '');
	const restoreFocusRef = useRef<HTMLElement | null>(null);
	const [isOpen, setIsOpen] = useControllableState({
		defaultValue: defaultOpen,
		onChange: onOpenChange,
		value: open,
	});

	useEffect(() => {
		if (typeof document === 'undefined') {
			return;
		}

		if (isOpen) {
			restoreFocusRef.current = document.activeElement as HTMLElement | null;
			return;
		}

		restoreFocusRef.current?.focus();
	}, [isOpen]);

	const value = useMemo<DialogContextValue>(
		() => ({
			contentId: `c15t-dialog-content-${reactId}`,
			descriptionId: `c15t-dialog-description-${reactId}`,
			open: isOpen,
			restoreFocusRef,
			setOpen: setIsOpen,
			titleId: `c15t-dialog-title-${reactId}`,
		}),
		[isOpen, reactId, restoreFocusRef, setIsOpen]
	);

	return (
		<DialogContext.Provider value={value}>{children}</DialogContext.Provider>
	);
};

export interface DialogTriggerProps extends Omit<
	ButtonHTMLAttributes<HTMLButtonElement>,
	'type'
> {
	asChild?: boolean;
}

const DialogTrigger = forwardRef<HTMLButtonElement, DialogTriggerProps>(
	// oxlint-disable-next-line prefer-arrow-callback -- React component definitions require function expressions.
	function DialogTrigger(
		{ asChild, children, onClick, ...rest },
		forwardedRef
	) {
		const { open, setOpen } = useDialogContext();
		const Component = asChild ? Slot : 'button';

		return (
			<Component
				aria-expanded={open}
				data-slot="dialog-trigger"
				data-state={getDialogState(open)}
				onClick={(event: MouseEvent<HTMLButtonElement>) => {
					setOpen(true);
					onClick?.(event as never);
				}}
				ref={forwardedRef}
				{...(asChild ? rest : { type: 'button', ...rest })}
			>
				{children}
			</Component>
		);
	}
);

DialogTrigger.displayName = 'DialogTrigger';

const DialogPortal = ({ children }: { children: ReactNode }) => {
	if (typeof document === 'undefined') {
		return null;
	}

	return createPortal(children, document.body);
};

const DialogOverlay = forwardRef<
	HTMLButtonElement,
	HTMLAttributes<HTMLButtonElement>
	// oxlint-disable-next-line prefer-arrow-callback -- React component definitions require function expressions.
>(function DialogOverlay({ children, onClick, ...rest }, forwardedRef) {
	const { open, setOpen } = useDialogContext();
	if (!open) {
		return null;
	}

	return (
		<button
			aria-label="Dismiss dialog"
			data-slot="dialog-overlay"
			data-state={getDialogState(open)}
			onClick={(event) => {
				setOpen(false);
				onClick?.(event as never);
			}}
			ref={forwardedRef}
			tabIndex={-1}
			type="button"
			{...rest}
		>
			{children}
		</button>
	);
});

DialogOverlay.displayName = 'DialogOverlay';

export interface DialogContentProps extends HTMLAttributes<HTMLDialogElement> {
	closeOnOutsideClick?: boolean;
	initialFocusRef?: RefObject<HTMLElement | null>;
}

const DialogContent = forwardRef<HTMLDialogElement, DialogContentProps>(
	// oxlint-disable-next-line prefer-arrow-callback -- React component definitions require function expressions.
	function DialogContent(
		{
			children,
			closeOnOutsideClick = true,
			initialFocusRef,
			onKeyDown,
			onMouseDown,
			...rest
		},
		forwardedRef
	) {
		const { contentId, descriptionId, open, setOpen, titleId } =
			useDialogContext();
		const contentRef = useRef<HTMLDialogElement | null>(null);

		useFocusTrap(open, contentRef);
		useScrollLock(open);

		useEffect(() => {
			if (open) {
				initialFocusRef?.current?.focus();
				if (!initialFocusRef?.current) {
					contentRef.current?.focus();
				}
			}
		}, [initialFocusRef, open]);

		if (!open) {
			return null;
		}

		const contentEventHandlers = {
			onKeyDown: (event: KeyboardEvent<HTMLDialogElement>) => {
				if (isDialogDismissKey(event.key)) {
					event.preventDefault();
					setOpen(false);
				}

				onKeyDown?.(event);
			},
			onMouseDown: (event: MouseEvent<HTMLDialogElement>) => {
				if (closeOnOutsideClick && event.target === event.currentTarget) {
					setOpen(false);
				}

				onMouseDown?.(event);
			},
		};

		return (
			<dialog
				aria-describedby={descriptionId}
				aria-labelledby={titleId}
				aria-modal="true"
				data-slot="dialog-content"
				data-state={getDialogState(open)}
				id={contentId}
				{...contentEventHandlers}
				ref={(node) => {
					contentRef.current = node;
					if (typeof forwardedRef === 'function') {
						forwardedRef(node);
					} else if (forwardedRef) {
						forwardedRef.current = node;
					}
				}}
				open={open}
				tabIndex={-1}
				{...rest}
			>
				{children}
			</dialog>
		);
	}
);

DialogContent.displayName = 'DialogContent';

const DialogTitle = forwardRef<
	HTMLHeadingElement,
	HTMLAttributes<HTMLHeadingElement>
	// oxlint-disable-next-line prefer-arrow-callback -- React component definitions require function expressions.
>(function DialogTitle({ children, ...props }, forwardedRef) {
	const { titleId } = useDialogContext();
	return (
		<h2
			ref={forwardedRef}
			id={titleId}
			data-slot="dialog-title"
			{...props}
		>
			{children}
		</h2>
	);
});

DialogTitle.displayName = 'DialogTitle';

const DialogDescription = forwardRef<
	HTMLParagraphElement,
	HTMLAttributes<HTMLParagraphElement>
	// oxlint-disable-next-line prefer-arrow-callback -- React component definitions require function expressions.
>(function DialogDescription(props, forwardedRef) {
	const { descriptionId } = useDialogContext();
	return (
		<p
			ref={forwardedRef}
			id={descriptionId}
			data-slot="dialog-description"
			{...props}
		/>
	);
});

DialogDescription.displayName = 'DialogDescription';

export interface DialogCloseProps extends Omit<
	ButtonHTMLAttributes<HTMLButtonElement>,
	'type'
> {
	asChild?: boolean;
	disabled?: boolean;
}

const DialogClose = forwardRef<HTMLButtonElement, DialogCloseProps>(
	// oxlint-disable-next-line prefer-arrow-callback -- React component definitions require function expressions.
	function DialogClose(
		{ asChild, children, disabled, onClick, ...rest },
		forwardedRef
	) {
		const { open, setOpen } = useDialogContext();
		const Component = asChild ? Slot : 'button';

		return (
			<Component
				data-disabled={getDataDisabled(disabled)}
				data-slot="dialog-close"
				data-state={getDialogState(open)}
				disabled={disabled}
				onClick={(event: MouseEvent<HTMLButtonElement>) => {
					if (!disabled) {
						setOpen(false);
					}

					onClick?.(event as never);
				}}
				ref={forwardedRef}
				{...(asChild ? rest : { type: 'button', ...rest })}
			>
				{children}
			</Component>
		);
	}
);

DialogClose.displayName = 'DialogClose';

export {
	DialogClose as Close,
	DialogContent as Content,
	DialogDescription as Description,
	DialogOverlay as Overlay,
	DialogPortal as Portal,
	DialogRoot as Root,
	DialogTitle as Title,
	DialogTrigger as Trigger,
};
