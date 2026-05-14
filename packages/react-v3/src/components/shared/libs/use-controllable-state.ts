import { useMemo, useState } from 'react';

interface UseControllableStateOptions<T> {
	defaultValue: T;
	onChange?: (value: T) => void;
	value?: T;
}

export function useControllableState<T>({
	defaultValue,
	onChange,
	value,
}: UseControllableStateOptions<T>) {
	const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
	const isControlled = value !== undefined;
	const currentValue = useMemo(
		() => (isControlled ? (value as T) : uncontrolledValue),
		[isControlled, uncontrolledValue, value]
	);

	const setValue = (nextValue: T) => {
		if (!isControlled) {
			setUncontrolledValue(nextValue);
		}

		onChange?.(nextValue);
	};

	return [currentValue, setValue] as const;
}
