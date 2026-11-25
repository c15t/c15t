import { describe, expect, test, vi } from 'vitest';

import { onDialogDismiss } from '../dialog';

const press = (target: EventTarget, handled = false) => {
	const event = new KeyboardEvent('keydown', {
		bubbles: true,
		cancelable: true,
		key: 'Escape',
	});
	if (handled) {
		event.preventDefault();
	}
	target.dispatchEvent(event);
	return event;
};

describe('onDialogDismiss', () => {
	test('closes only the dialog registered last', () => {
		const first = document.createElement('div');
		const second = document.createElement('div');
		document.body.append(first, second);
		const closeFirst = vi.fn();
		const closeSecond = vi.fn();
		const stopFirst = onDialogDismiss(first, closeFirst);
		const stopSecond = onDialogDismiss(second, closeSecond);

		const event = press(first);
		expect(closeSecond).toHaveBeenCalledOnce();
		expect(closeFirst).not.toHaveBeenCalled();
		expect(event.defaultPrevented).toBe(true);

		stopSecond();
		press(first);
		expect(closeFirst).toHaveBeenCalledOnce();

		stopFirst();
		press(first);
		expect(closeFirst).toHaveBeenCalledOnce();
		first.remove();
		second.remove();
	});

	test('leaves an Escape something else already handled', () => {
		const dialog = document.createElement('div');
		document.body.append(dialog);
		const close = vi.fn();
		const stop = onDialogDismiss(dialog, close);

		press(dialog, true);
		expect(close).not.toHaveBeenCalled();
		stop();
		dialog.remove();
	});
});
