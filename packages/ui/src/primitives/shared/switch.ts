import { getCheckedState } from './data-state';

export const getSwitchState = function getSwitchState(checked: boolean) {
	return getCheckedState(checked);
};

export const toggleSwitchValue = function toggleSwitchValue(current: boolean) {
	return !current;
};
