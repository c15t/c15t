export type PrimitiveOpenState = 'open' | 'closed';
export type PrimitiveCheckedState = 'checked' | 'unchecked';

export const getOpenState = function getOpenState(
	open: boolean
): PrimitiveOpenState {
	return open ? 'open' : 'closed';
};

export const getCheckedState = function getCheckedState(
	checked: boolean
): PrimitiveCheckedState {
	return checked ? 'checked' : 'unchecked';
};

export const getDataDisabled = function getDataDisabled(
	disabled?: boolean
): '' | undefined {
	return disabled ? '' : undefined;
};
