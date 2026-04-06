import { getOpenState } from './data-state';

export type AccordionType = 'single' | 'multiple';

export function isAccordionItemOpen(
	type: AccordionType,
	value: string | string[] | undefined,
	itemValue: string
): boolean {
	if (type === 'multiple') {
		return Array.isArray(value) && value.includes(itemValue);
	}

	return value === itemValue;
}

export function toggleAccordionValue(params: {
	type: AccordionType;
	value: string | string[] | undefined;
	itemValue: string;
	collapsible?: boolean;
}): string | string[] | undefined {
	const { type, value, itemValue, collapsible = false } = params;

	if (type === 'multiple') {
		const current = Array.isArray(value) ? value : [];
		return current.includes(itemValue)
			? current.filter((entry) => entry !== itemValue)
			: [...current, itemValue];
	}

	if (value === itemValue) {
		return collapsible ? undefined : itemValue;
	}

	return itemValue;
}

export function getAccordionItemState(
	type: AccordionType,
	value: string | string[] | undefined,
	itemValue: string
) {
	return getOpenState(isAccordionItemOpen(type, value, itemValue));
}
