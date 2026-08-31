import { getOpenState } from './data-state';

export const getDialogState = function getDialogState(open: boolean) {
	return getOpenState(open);
};

export const isDialogDismissKey = function isDialogDismissKey(key: string) {
	return key === 'Escape';
};
