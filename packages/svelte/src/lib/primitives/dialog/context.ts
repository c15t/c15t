import { getContext, setContext } from 'svelte';

const DIALOG_ROOT_CONTEXT_KEY = Symbol('c15t-svelte-dialog-root');

export interface DialogRootContextValue {
	readonly closeOnEscape: boolean;
	readonly closeOnInteractOutside: boolean;
	readonly contentId: string;
	readonly descriptionId: string;
	readonly open: boolean;
	readonly preventScroll: boolean;
	readonly shouldRender: boolean;
	readonly titleId: string;
	readonly trapFocus: boolean;
	requestClose: (reason: 'backdrop' | 'close-trigger' | 'escape') => void;
}

export function setDialogRootContext(value: DialogRootContextValue) {
	setContext(DIALOG_ROOT_CONTEXT_KEY, value);
}

export function getDialogRootContext(): DialogRootContextValue {
	const context = getContext<DialogRootContextValue | undefined>(
		DIALOG_ROOT_CONTEXT_KEY
	);

	if (!context) {
		throw new Error('Dialog primitives must be used within Dialog.Root');
	}

	return context;
}
