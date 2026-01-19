import { describe, expect, test } from 'vitest';
import { mergeStyles } from '../merge-styles';

describe('mergeStyles', () => {
	describe('normalization', () => {
		test('normalizes string to ClassNameStyle object', () => {
			const result = mergeStyles('my-class');
			expect(result.className).toBe('my-class');
		});

		test('handles undefined second style', () => {
			const result = mergeStyles({ className: 'my-class' }, undefined);
			expect(result.className).toBe('my-class');
		});

		test('handles empty object', () => {
			const result = mergeStyles({});
			expect(result.className).toBeUndefined();
			expect(result.style).toBeUndefined();
		});
	});

	describe('className merging', () => {
		test('merges two string classNames', () => {
			const result = mergeStyles('class1', 'class2');
			expect(result.className).toBe('class1 class2');
		});

		test('merges classNames from objects', () => {
			const result = mergeStyles(
				{ className: 'class1' },
				{ className: 'class2' }
			);
			expect(result.className).toBe('class1 class2');
		});

		test('includes baseClassName in merge order', () => {
			const result = mergeStyles(
				{ baseClassName: 'base1', className: 'class1' },
				{ baseClassName: 'base2', className: 'class2' }
			);
			expect(result.className).toBe('base1 class1 base2 class2');
		});
	});

	describe('style merging', () => {
		test('merges style objects', () => {
			const result = mergeStyles(
				{ style: { color: 'red' } },
				{ style: { backgroundColor: 'blue' } }
			);
			expect(result.style).toEqual({
				color: 'red',
				backgroundColor: 'blue',
			});
		});

		test('second style overrides first for same property', () => {
			const result = mergeStyles(
				{ style: { color: 'red' } },
				{ style: { color: 'blue' } }
			);
			expect(result.style).toEqual({ color: 'blue' });
		});

		test('returns undefined style when no styles provided', () => {
			const result = mergeStyles({ className: 'class1' });
			expect(result.style).toBeUndefined();
		});
	});

	describe('noStyle handling', () => {
		test('respects noStyle from first style', () => {
			const result = mergeStyles(
				{ className: 'class1', noStyle: true },
				{ className: 'class2' }
			);
			expect(result.noStyle).toBe(true);
		});

		test('noStyle in second style completely overrides first', () => {
			const result = mergeStyles(
				{ className: 'class1', style: { color: 'red' } },
				{ className: 'class2', noStyle: true }
			);
			expect(result.noStyle).toBe(true);
			expect(result.className).toBe('class2');
		});

		test('noStyle in second style preserves its own styles', () => {
			const result = mergeStyles(
				{ className: 'class1', style: { color: 'red' } },
				{
					className: 'class2',
					style: { backgroundColor: 'blue' },
					noStyle: true,
				}
			);
			expect(result.style).toEqual({ backgroundColor: 'blue' });
		});
	});

	describe('edge cases', () => {
		test('handles both styles as strings', () => {
			const result = mergeStyles('class1', 'class2');
			expect(result.className).toBe('class1 class2');
			expect(result.style).toBeUndefined();
		});

		test('handles mixed string and object', () => {
			const result = mergeStyles('class1', {
				className: 'class2',
				style: { color: 'red' },
			});
			expect(result.className).toBe('class1 class2');
			expect(result.style).toEqual({ color: 'red' });
		});

		test('handles complex merge scenario', () => {
			const result = mergeStyles(
				{
					baseClassName: 'base-default',
					className: 'user-class-1',
					style: { padding: '10px', margin: '5px' },
				},
				{
					className: 'user-class-2',
					style: { margin: '10px', border: '1px solid' },
				}
			);
			expect(result.className).toBe('base-default user-class-1 user-class-2');
			expect(result.style).toEqual({
				padding: '10px',
				margin: '10px',
				border: '1px solid',
			});
		});
	});
});
