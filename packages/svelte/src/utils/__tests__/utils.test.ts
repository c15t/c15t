/**
 * Tests for utility functions.
 *
 * Mirrors: packages/react/src/hooks/__tests__/use-styles.test.tsx
 */

import type { AllThemeKeys, Theme } from '@c15t/ui/theme';
import { describe, expect, test } from 'vitest';
import {
	defaultTheme,
	generateThemeCSS,
	resolveComponentStyles,
} from '~/utils';

describe('Utils', () => {
	describe('defaultTheme', () => {
		test('should be a valid theme object', () => {
			expect(defaultTheme).toBeDefined();
			expect(typeof defaultTheme).toBe('object');
		});
	});

	describe('resolveComponentStyles', () => {
		test('returns component styles when no theme is provided', () => {
			const result = resolveComponentStyles(
				'dialogCard' as AllThemeKeys,
				undefined,
				{
					className: 'component-class',
					style: { backgroundColor: 'red' },
				},
				false
			);

			expect(result.className).toContain('component-class');
			expect(result.style).toEqual({ backgroundColor: 'red' });
		});

		test('merges theme and component styles correctly', () => {
			const theme = {
				slots: {
					dialogCard: {
						className: 'theme-class',
						style: { color: 'blue' },
					},
				},
			};

			const result = resolveComponentStyles(
				'dialogCard' as AllThemeKeys,
				theme as Theme,
				{
					className: 'component-class',
					style: { backgroundColor: 'red' },
				},
				false
			);

			expect(result.className).toContain('theme-class');
			expect(result.className).toContain('component-class');
			expect(result.style).toEqual({
				color: 'blue',
				backgroundColor: 'red',
			});
		});

		test('handles string className correctly', () => {
			const theme = {
				slots: {
					dialogCard: {
						className: 'theme-class',
					},
				},
			};

			const result = resolveComponentStyles(
				'dialogCard' as AllThemeKeys,
				theme as Theme,
				'component-class',
				false
			);

			expect(result.className).toContain('theme-class');
			expect(result.className).toContain('component-class');
		});

		test('should respect noStyle flag', () => {
			const result = resolveComponentStyles(
				'dialogCard' as AllThemeKeys,
				undefined,
				{
					baseClassName: 'base-class-to-remove',
					className: 'component-class',
					style: { backgroundColor: 'red' },
					noStyle: true,
				},
				true
			);

			expect(result.className).toContain('component-class');
			expect(result.noStyle).toBe(true);
			expect(result.style).toEqual({ backgroundColor: 'red' });
		});
	});

	describe('generateThemeCSS', () => {
		test('should generate CSS string from theme', () => {
			const css = generateThemeCSS(defaultTheme as Theme);
			expect(typeof css).toBe('string');
		});
	});
});
