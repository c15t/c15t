export type ButtonPrimitiveState = 'enabled' | 'disabled';

export const getButtonPrimitiveState = function getButtonPrimitiveState(
	disabled?: boolean
): ButtonPrimitiveState {
	return disabled ? 'disabled' : 'enabled';
};
