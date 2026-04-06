export type PrimitiveOpenState = 'open' | 'closed';
export type PrimitiveCheckedState = 'checked' | 'unchecked';

export function getOpenState(open: boolean): PrimitiveOpenState {
	return open ? 'open' : 'closed';
}

export function getCheckedState(checked: boolean): PrimitiveCheckedState {
	return checked ? 'checked' : 'unchecked';
}

export function getDataDisabled(disabled?: boolean): '' | undefined {
	return disabled ? '' : undefined;
}
