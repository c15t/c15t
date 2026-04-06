import { getOpenState } from './data-state';

export function getDialogState(open: boolean) {
	return getOpenState(open);
}

export function isDialogDismissKey(key: string) {
	return key === 'Escape';
}
