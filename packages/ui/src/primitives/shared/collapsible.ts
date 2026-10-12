import { getOpenState } from './data-state';

export const getCollapsibleState = function getCollapsibleState(open: boolean) {
	return getOpenState(open);
};

export const toggleCollapsibleValue = function toggleCollapsibleValue(
	current: boolean
) {
	return !current;
};
