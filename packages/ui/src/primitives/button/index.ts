export type ButtonPrimitiveState = 'enabled' | 'disabled';

export function getButtonPrimitiveState(
	disabled?: boolean
): ButtonPrimitiveState {
	return disabled ? 'disabled' : 'enabled';
}
