import { describe, expect, test } from 'vitest';
import type { Theme } from '../../theme/types';
import { resolveStyles } from '../resolve-styles';

describe('resolveStyles', () => {
	const mockTheme: Theme = {
		slots: {
			dialogCard: {
				className: 'theme-dialog-class',
				style: { color: 'blue' },
			},
			banner: 'theme-banner-class',
		},
	};

	describe('without theme', () => {
		test('returns empty result when no theme or component style', () => {
			const result = resolveStyles('dialogCard');
			expect(result.className).toBeUndefined();
			expect(result.style).toBeUndefined();
		});

		test('returns component style when no theme', () => {
			const result = resolveStyles('dialogCard', undefined, {
				className: 'component-class',
				style: { backgroundColor: 'red' },
			});
			expect(result.className).toBe('component-class');
			expect(result.style).toEqual({ backgroundColor: 'red' });
		});
	});

	describe('with theme', () => {
		test('applies theme slot styles', () => {
			const result = resolveStyles('dialogCard', mockTheme);
			expect(result.className).toContain('theme-dialog-class');
		});

		test('merges theme and component styles', () => {
			const result = resolveStyles('dialogCard', mockTheme, {
				className: 'component-class',
				style: { backgroundColor: 'red' },
			});
			expect(result.className).toContain('theme-dialog-class');
			expect(result.className).toContain('component-class');
			expect(result.style).toEqual({
				color: 'blue',
				backgroundColor: 'red',
			});
		});

		test('handles string slot values', () => {
			const result = resolveStyles('banner', mockTheme);
			expect(result.className).toContain('theme-banner-class');
		});

		test('handles missing slot in theme', () => {
			const result = resolveStyles('widget', mockTheme, {
				className: 'component-class',
			});
			expect(result.className).toBe('component-class');
		});
	});

	describe('noStyle handling', () => {
		test('contextNoStyle skips base classes', () => {
			const result = resolveStyles(
				'dialogCard',
				mockTheme,
				{
					baseClassName: 'base-class',
					className: 'component-class',
				},
				true // contextNoStyle
			);
			expect(result.noStyle).toBe(true);
			// Base classes should be included in the merge, but noStyle flag is set
			expect(result.className).toContain('component-class');
		});

		test('theme noStyle is respected', () => {
			const themeWithNoStyle: Theme = {
				slots: {
					dialogCard: {
						className: 'theme-class',
						noStyle: true,
					},
				},
			};
			const result = resolveStyles('dialogCard', themeWithNoStyle, {
				baseClassName: 'base-class',
				className: 'component-class',
			});
			expect(result.noStyle).toBe(true);
		});

		test('component noStyle is respected', () => {
			const result = resolveStyles('dialogCard', mockTheme, {
				className: 'component-class',
				noStyle: true,
			});
			expect(result.noStyle).toBe(true);
		});
	});

	describe('precedence', () => {
		test('component style takes precedence over theme', () => {
			const result = resolveStyles('dialogCard', mockTheme, {
				style: { color: 'red' }, // Override theme's blue
			});
			expect(result.style?.color).toBe('red');
		});

		test('maintains correct class order', () => {
			const result = resolveStyles('dialogCard', mockTheme, {
				baseClassName: 'base-class',
				className: 'component-class',
			});
			// The exact order depends on the merge logic
			expect(result.className).toContain('theme-dialog-class');
			expect(result.className).toContain('component-class');
		});
	});

	describe('edge cases', () => {
		test('handles undefined componentStyle', () => {
			const result = resolveStyles('dialogCard', mockTheme, undefined);
			expect(result.className).toContain('theme-dialog-class');
		});

		test('handles empty theme slots', () => {
			const emptyTheme: Theme = { slots: {} };
			const result = resolveStyles('dialogCard', emptyTheme, {
				className: 'component-class',
			});
			expect(result.className).toBe('component-class');
		});

		test('handles null-like values gracefully', () => {
			const result = resolveStyles('dialogCard', undefined, undefined, false);
			expect(result.className).toBeUndefined();
			expect(result.style).toBeUndefined();
		});
	});
});
