import { describe, expect, test } from 'vitest';
import {
	getAccordionItemState,
	getButtonPrimitiveState,
	getCollapsibleState,
	getDataDisabled,
	getDialogState,
	getNextTabValue,
	getPreferenceItemState,
	getSwitchState,
	getTabPanelState,
	getTabState,
	toggleAccordionValue,
	toggleCollapsibleValue,
	togglePreferenceItemValue,
	toggleSwitchValue,
} from '~/primitives';

describe('primitives helpers', () => {
	test('switch state helpers toggle and expose stable data-state', () => {
		expect(getSwitchState(false)).toBe('unchecked');
		expect(toggleSwitchValue(false)).toBe(true);
	});

	test('accordion helpers manage single and multiple values', () => {
		expect(
			toggleAccordionValue({
				type: 'single',
				value: undefined,
				itemValue: 'item-1',
			})
		).toBe('item-1');

		expect(
			toggleAccordionValue({
				type: 'multiple',
				value: ['item-1'],
				itemValue: 'item-2',
			})
		).toEqual(['item-1', 'item-2']);

		expect(getAccordionItemState('single', 'item-1', 'item-1')).toBe('open');
	});

	test('button, dialog, and disabled helpers expose expected attributes', () => {
		expect(getButtonPrimitiveState()).toBe('enabled');
		expect(getButtonPrimitiveState(true)).toBe('disabled');
		expect(getDialogState(true)).toBe('open');
		expect(getDataDisabled(true)).toBe('');
	});

	test('collapsible helpers expose expected attributes', () => {
		expect(getCollapsibleState(true)).toBe('open');
		expect(getCollapsibleState(false)).toBe('closed');
		expect(toggleCollapsibleValue(false)).toBe(true);
	});

	test('preference item helpers expose expected attributes', () => {
		expect(getPreferenceItemState(true)).toBe('open');
		expect(getPreferenceItemState(false)).toBe('closed');
		expect(togglePreferenceItemValue(false)).toBe(true);
	});

	test('tabs helpers derive state and keyboard navigation', () => {
		expect(getTabState(true)).toBe('active');
		expect(getTabPanelState(false)).toBe('inactive');
		expect(
			getNextTabValue({
				currentValue: 'one',
				key: 'ArrowRight',
				orientation: 'horizontal',
				triggerValues: ['one', 'two', 'three'],
			})
		).toBe('two');
		expect(
			getNextTabValue({
				currentValue: 'three',
				key: 'ArrowDown',
				orientation: 'vertical',
				triggerValues: ['one', 'two', 'three'],
			})
		).toBe('one');
	});
});
