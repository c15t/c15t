'use client';

import { getDataDisabled } from '@c15t/ui/primitives/data-state';
import { getDialogState, isDialogDismissKey } from '@c15t/ui/primitives/dialog';
import {
	type ButtonHTMLAttributes,
	createContext,
	forwardRef,
	type HTMLAttributes,
	type MouseEvent,
	type ReactNode,
	type RefObject,
	useContext,
	useEffect,
	useId,
	useMemo,
	useRef,
} from 'react';
import { createPortal } from 'react-dom';
import { Slot } from '~/components/shared/libs/slot';
import { useControllableState } from '~/components/shared/libs/use-controllable-state';
import { useFocusTrap } from '~/hooks/use-focus-trap';
import { useScrollLock } from '~/hooks/use-scroll-lock';

type DialogContextValue = {
	contentId: string;
	descriptionId: string;
	open: boolean;
	restoreFocusRef: RefObject<HTMLElement | null>;
	setOpen: (open: boolean) => void;
	titleId: string;
};

const DialogContext = createContext<DialogContextValue | null>(null);

function useDialogContext() {
	const context = useContext(DialogContext);

	if (!context) {
		throw new Error('Dialog components must be used within DialogRoot');
	}

	return context;
}

export interface DialogRootProps {
	children: ReactNode;
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
	open?: boolean;
}

function DialogRoot({
	children,
	defaultOpen = false,
	onOpenChange,
	open,
}: DialogRootProps) {
	const reactId = useId().replace(/:/g, '');
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
}

export interface DialogTriggerProps
	extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
	asChild?: boolean;
}

const DialogTrigger = forwardRef<HTMLButtonElement, DialogTriggerProps>(
	({ asChild, children, onClick, ...rest }, forwardedRef) => {
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

function DialogPortal({ children }: { children: ReactNode }) {
	if (typeof document === 'undefined') {
		return null;
	}

	return createPortal(children, document.body);
}

const DialogOverlay = forwardRef<
	HTMLButtonElement,
	HTMLAttributes<HTMLButtonElement>
>(({ children, onClick, ...rest }, forwardedRef) => {
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

export interface DialogContentProps extends HTMLAttributes<HTMLDivElement> {
	closeOnOutsideClick?: boolean;
	initialFocusRef?: RefObject<HTMLElement | null>;
}

const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(
	(
		{
			children,
			closeOnOutsideClick = true,
			initialFocusRef,
			onKeyDown,
			onMouseDown,
			...rest
		},
		forwardedRef
	) => {
		const { contentId, descriptionId, open, setOpen, titleId } =
			useDialogContext();
		const contentRef = useRef<HTMLDivElement | null>(null);

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

		return (
			<div
				aria-describedby={descriptionId}
				aria-labelledby={titleId}
				aria-modal="true"
				data-slot="dialog-content"
				data-state={getDialogState(open)}
				id={contentId}
				onKeyDown={(event) => {
					if (isDialogDismissKey(event.key)) {
						event.preventDefault();
						setOpen(false);
					}

					onKeyDown?.(event);
				}}
				onMouseDown={(event) => {
					if (closeOnOutsideClick && event.target === event.currentTarget) {
						setOpen(false);
					}

					onMouseDown?.(event);
				}}
				ref={(node) => {
					contentRef.current = node;
					if (typeof forwardedRef === 'function') {
						forwardedRef(node);
					} else if (forwardedRef) {
						forwardedRef.current = node;
					}
				}}
				role="dialog"
				tabIndex={-1}
				{...rest}
			>
				{children}
			</div>
		);
	}
);

DialogContent.displayName = 'DialogContent';

const DialogTitle = forwardRef<
	HTMLHeadingElement,
	HTMLAttributes<HTMLHeadingElement>
>((props, forwardedRef) => {
	const { titleId } = useDialogContext();
	return (
		<h2 ref={forwardedRef} id={titleId} data-slot="dialog-title" {...props} />
	);
});

DialogTitle.displayName = 'DialogTitle';

const DialogDescription = forwardRef<
	HTMLParagraphElement,
	HTMLAttributes<HTMLParagraphElement>
>((props, forwardedRef) => {
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

export interface DialogCloseProps
	extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
	asChild?: boolean;
	disabled?: boolean;
}

const DialogClose = forwardRef<HTMLButtonElement, DialogCloseProps>(
	({ asChild, children, disabled, onClick, ...rest }, forwardedRef) => {
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
