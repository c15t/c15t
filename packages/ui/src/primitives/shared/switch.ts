import { getCheckedState } from './data-state';

export function getSwitchState(checked: boolean) {
	return getCheckedState(checked);
}

export function toggleSwitchValue(current: boolean) {
	return !current;
}
