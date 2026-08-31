import { describe, expect, test } from 'vitest';

import { mergeSlotProps } from '~/v3/utils/merge-slot-props';

describe('mergeSlotProps', () => {
	test('returns component props when no slot is provided', () => {
		const result = mergeSlotProps(undefined, {
			className: 'component-class',
			style: { backgroundColor: 'red' },
		});

		expect(result.className).toContain('component-class');
		expect(result.style).toEqual({ backgroundColor: 'red' });
	});

	test('merges slot and component props with component precedence', () => {
		const result = mergeSlotProps(
			{
				className: 'slot-class',
				'data-slot-value': 'slot',
				style: { color: 'blue' },
			},
			{
				className: 'component-class',
				'data-slot-value': 'component',
				style: { backgroundColor: 'red' },
			}
		);

		expect(result.className).toContain('slot-class');
		expect(result.className).toContain('component-class');
		expect(result.style).toEqual({
			backgroundColor: 'red',
			color: 'blue',
		});
		expect(result['data-slot-value']).toBe('component');
	});

	test('drops base classes but keeps slot and component classes when noStyle is true', () => {
		const result = mergeSlotProps(
			{
				className: 'slot-class',
				style: { color: 'blue' },
			},
			{
				baseClassName: 'base-class-to-remove',
				className: 'component-class',
				noStyle: true,
				style: { backgroundColor: 'red' },
			}
		);

		expect(result.className).not.toContain('base-class-to-remove');
		expect(result.className).toContain('slot-class');
		expect(result.className).toContain('component-class');
		expect(result).not.toHaveProperty('noStyle');
		expect(result.style).toEqual({
			backgroundColor: 'red',
			color: 'blue',
		});
	});
});
