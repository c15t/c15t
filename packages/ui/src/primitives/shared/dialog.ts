import { getOpenState } from './data-state';

export const getDialogState = function getDialogState(open: boolean) {
	return getOpenState(open);
};

export const isDialogDismissKey = function isDialogDismissKey(key: string) {
	return key === 'Escape';
};

/** The dialogs open in one document and its one Escape listener. */
interface OpenDialogs {
	/** Close callbacks, oldest first. */
	closes: (() => void)[];
	onKeyDown: (event: KeyboardEvent) => void;
}

const openDialogs = new WeakMap<Document, OpenDialogs>();

/**
 * Close a dialog when the visitor presses Escape anywhere in its document.
 *
 * @remarks
 * With several dialogs open, Escape closes only the one registered last,
 * the top one. An Escape that something else already handled
 * (`defaultPrevented`), such as a dialog on top that listens on its own
 * element, is left alone. An Escape this handles is marked handled.
 *
 * Shared by c15t's framework packages, like the other dialog helpers here;
 * not part of the documented API.
 *
 * @param element - The dialog, or any element in its document.
 * @param close - Closes the dialog.
 * @returns Removes the dialog from the stack.
 *
 * @example
 * ```ts
 * const stop = onDialogDismiss(dialog, () => setOpen(false));
 * ```
 * @internal
 */
export const onDialogDismiss = function onDialogDismiss(
	element: Element,
	close: () => void
): () => void {
	const target = element.ownerDocument;
	let dialogs = openDialogs.get(target);
	if (!dialogs) {
		const created: OpenDialogs = {
			closes: [],
			onKeyDown(event) {
				const top = created.closes[created.closes.length - 1];
				if (top && isDialogDismissKey(event.key) && !event.defaultPrevented) {
					event.preventDefault();
					top();
				}
			},
		};
		dialogs = created;
		openDialogs.set(target, created);
		target.addEventListener('keydown', created.onKeyDown);
	}
	const stack = dialogs;
	// A fresh function, so the same `close` registered twice is two entries.
	const entry = (): void => close();
	stack.closes.push(entry);
	return () => {
		const index = stack.closes.indexOf(entry);
		if (index === -1) {
			return;
		}
		stack.closes.splice(index, 1);
		if (stack.closes.length === 0) {
			target.removeEventListener('keydown', stack.onKeyDown);
			openDialogs.delete(target);
		}
	};
};
