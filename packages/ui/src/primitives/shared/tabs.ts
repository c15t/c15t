export type TabsOrientation = 'horizontal' | 'vertical';

export function getTabState(selected: boolean) {
	return selected ? 'active' : 'inactive';
}

export function getTabPanelState(selected: boolean) {
	return selected ? 'active' : 'inactive';
}

export function getNextTabValue(params: {
	orientation: TabsOrientation;
	loop?: boolean;
	triggerValues: string[];
	currentValue: string;
	key: string;
}) {
	const { currentValue, key, loop = true, orientation, triggerValues } = params;

	const currentIndex = triggerValues.indexOf(currentValue);
	if (currentIndex === -1) {
		return currentValue;
	}

	const isHorizontal = orientation === 'horizontal';
	const previousKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp';
	const nextKey = isHorizontal ? 'ArrowRight' : 'ArrowDown';

	if (key === 'Home') {
		return triggerValues[0] ?? currentValue;
	}

	if (key === 'End') {
		return triggerValues[triggerValues.length - 1] ?? currentValue;
	}

	if (key !== previousKey && key !== nextKey) {
		return currentValue;
	}

	const delta = key === previousKey ? -1 : 1;
	const nextIndex = currentIndex + delta;

	if (nextIndex < 0) {
		return loop
			? (triggerValues[triggerValues.length - 1] ?? currentValue)
			: currentValue;
	}

	if (nextIndex >= triggerValues.length) {
		return loop ? (triggerValues[0] ?? currentValue) : currentValue;
	}

	return triggerValues[nextIndex] ?? currentValue;
}
