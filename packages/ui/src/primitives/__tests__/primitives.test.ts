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
		expect(getTabState(false)).toBe('inactive');
		expect(getTabPanelState(true)).toBe('active');
		expect(getTabPanelState(false)).toBe('inactive');
	});

	describe('getNextTabValue', () => {
		const triggerValues = ['one', 'two', 'three'];

		test('ArrowRight moves forward in horizontal mode', () => {
			expect(
				getNextTabValue({
					currentValue: 'one',
					key: 'ArrowRight',
					orientation: 'horizontal',
					triggerValues,
				})
			).toBe('two');
		});

		test('ArrowLeft moves backward in horizontal mode', () => {
			expect(
				getNextTabValue({
					currentValue: 'two',
					key: 'ArrowLeft',
					orientation: 'horizontal',
					triggerValues,
				})
			).toBe('one');
		});

		test('ArrowDown moves forward in vertical mode', () => {
			expect(
				getNextTabValue({
					currentValue: 'one',
					key: 'ArrowDown',
					orientation: 'vertical',
					triggerValues,
				})
			).toBe('two');
		});

		test('ArrowUp moves backward in vertical mode', () => {
			expect(
				getNextTabValue({
					currentValue: 'two',
					key: 'ArrowUp',
					orientation: 'vertical',
					triggerValues,
				})
			).toBe('one');
		});

		test('Home returns first tab', () => {
			expect(
				getNextTabValue({
					currentValue: 'three',
					key: 'Home',
					orientation: 'horizontal',
					triggerValues,
				})
			).toBe('one');
		});

		test('End returns last tab', () => {
			expect(
				getNextTabValue({
					currentValue: 'one',
					key: 'End',
					orientation: 'horizontal',
					triggerValues,
				})
			).toBe('three');
		});

		test('loop enabled: ArrowRight on last wraps to first', () => {
			expect(
				getNextTabValue({
					currentValue: 'three',
					key: 'ArrowRight',
					loop: true,
					orientation: 'horizontal',
					triggerValues,
				})
			).toBe('one');
		});

		test('loop enabled: ArrowLeft on first wraps to last', () => {
			expect(
				getNextTabValue({
					currentValue: 'one',
					key: 'ArrowLeft',
					loop: true,
					orientation: 'horizontal',
					triggerValues,
				})
			).toBe('three');
		});

		test('loop disabled: ArrowRight on last stays', () => {
			expect(
				getNextTabValue({
					currentValue: 'three',
					key: 'ArrowRight',
					loop: false,
					orientation: 'horizontal',
					triggerValues,
				})
			).toBe('three');
		});

		test('loop disabled: ArrowLeft on first stays', () => {
			expect(
				getNextTabValue({
					currentValue: 'one',
					key: 'ArrowLeft',
					loop: false,
					orientation: 'horizontal',
					triggerValues,
				})
			).toBe('one');
		});

		test('wrong-axis keys are ignored in horizontal mode', () => {
			expect(
				getNextTabValue({
					currentValue: 'one',
					key: 'ArrowUp',
					orientation: 'horizontal',
					triggerValues,
				})
			).toBe('one');
			expect(
				getNextTabValue({
					currentValue: 'one',
					key: 'ArrowDown',
					orientation: 'horizontal',
					triggerValues,
				})
			).toBe('one');
		});

		test('wrong-axis keys are ignored in vertical mode', () => {
			expect(
				getNextTabValue({
					currentValue: 'one',
					key: 'ArrowLeft',
					orientation: 'vertical',
					triggerValues,
				})
			).toBe('one');
			expect(
				getNextTabValue({
					currentValue: 'one',
					key: 'ArrowRight',
					orientation: 'vertical',
					triggerValues,
				})
			).toBe('one');
		});

		test('unrecognized key returns current value', () => {
			expect(
				getNextTabValue({
					currentValue: 'one',
					key: 'Enter',
					orientation: 'horizontal',
					triggerValues,
				})
			).toBe('one');
		});

		test('currentValue not in list returns current value', () => {
			expect(
				getNextTabValue({
					currentValue: 'missing',
					key: 'ArrowRight',
					orientation: 'horizontal',
					triggerValues,
				})
			).toBe('missing');
		});

		test('single tab: navigation returns same value', () => {
			expect(
				getNextTabValue({
					currentValue: 'only',
					key: 'ArrowRight',
					loop: true,
					orientation: 'horizontal',
					triggerValues: ['only'],
				})
			).toBe('only');
		});

		test('vertical loop wraps correctly', () => {
			expect(
				getNextTabValue({
					currentValue: 'three',
					key: 'ArrowDown',
					loop: true,
					orientation: 'vertical',
					triggerValues,
				})
			).toBe('one');
			expect(
				getNextTabValue({
					currentValue: 'one',
					key: 'ArrowUp',
					loop: true,
					orientation: 'vertical',
					triggerValues,
				})
			).toBe('three');
		});
	});
});
