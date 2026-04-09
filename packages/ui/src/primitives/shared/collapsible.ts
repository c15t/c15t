import { getOpenState } from './data-state';

export function getCollapsibleState(open: boolean) {
	return getOpenState(open);
}

export function toggleCollapsibleValue(current: boolean) {
	return !current;
}
