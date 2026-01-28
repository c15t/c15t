import { describe, expect, test } from 'vitest';
import { buttonVariants } from '../button';

/**
 * Note: CSS modules return empty objects in test environments without a bundler.
 * These tests focus on:
 * 1. Function execution without errors
 * 2. Proper handling of variant props
 * 3. Custom class appending behavior
 * 4. Return type structure
 */
describe('buttonVariants', () => {
	describe('function structure', () => {
		test('returns object with root and icon methods', () => {
			const variants = buttonVariants();

			expect(typeof variants.root).toBe('function');
			expect(typeof variants.icon).toBe('function');
		});

		test('root method returns a string', () => {
			const variants = buttonVariants();
			const rootClass = variants.root();

			expect(typeof rootClass).toBe('string');
		});

		test('icon method returns a string', () => {
			const variants = buttonVariants();
			const iconClass = variants.icon();

			expect(typeof iconClass).toBe('string');
		});
	});

	describe('variant props handling', () => {
		test('accepts empty props object', () => {
			expect(() => buttonVariants({})).not.toThrow();
		});

		test('accepts undefined props', () => {
			expect(() => buttonVariants()).not.toThrow();
		});

		test('accepts primary variant', () => {
			expect(() => buttonVariants({ variant: 'primary' })).not.toThrow();
		});

		test('accepts neutral variant', () => {
			expect(() => buttonVariants({ variant: 'neutral' })).not.toThrow();
		});

		test('accepts filled mode', () => {
			expect(() => buttonVariants({ mode: 'filled' })).not.toThrow();
		});

		test('accepts stroke mode', () => {
			expect(() => buttonVariants({ mode: 'stroke' })).not.toThrow();
		});

		test('accepts lighter mode', () => {
			expect(() => buttonVariants({ mode: 'lighter' })).not.toThrow();
		});

		test('accepts ghost mode', () => {
			expect(() => buttonVariants({ mode: 'ghost' })).not.toThrow();
		});

		test('accepts all size variants', () => {
			expect(() => buttonVariants({ size: 'medium' })).not.toThrow();
			expect(() => buttonVariants({ size: 'small' })).not.toThrow();
			expect(() => buttonVariants({ size: 'xsmall' })).not.toThrow();
			expect(() => buttonVariants({ size: 'xxsmall' })).not.toThrow();
		});

		test('accepts all variant combinations', () => {
			const variants = ['primary', 'neutral'] as const;
			const modes = ['filled', 'stroke', 'lighter', 'ghost'] as const;

			for (const variant of variants) {
				for (const mode of modes) {
					expect(() => buttonVariants({ variant, mode })).not.toThrow();
				}
			}
		});
	});

	describe('custom class appending', () => {
		test('appends custom class to root', () => {
			const variants = buttonVariants();
			const customClass = 'my-custom-class';
			const rootClass = variants.root({ class: customClass });

			expect(rootClass).toContain(customClass);
		});

		test('appends custom class to icon', () => {
			const variants = buttonVariants();
			const customClass = 'my-icon-class';
			const iconClass = variants.icon({ class: customClass });

			expect(iconClass).toContain(customClass);
		});

		test('handles empty class option', () => {
			const variants = buttonVariants();
			const rootClass = variants.root({ class: '' });

			// Should not have trailing/leading spaces from empty class
			expect(rootClass.trim()).toBe(rootClass);
		});

		test('handles undefined options for root', () => {
			const variants = buttonVariants();
			expect(() => variants.root(undefined)).not.toThrow();
		});

		test('handles undefined options for icon', () => {
			const variants = buttonVariants();
			expect(() => variants.icon(undefined)).not.toThrow();
		});
	});
});
