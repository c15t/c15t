import { describe, expect, test } from 'vitest';
import { accordionVariants } from '../accordion';

/**
 * Note: CSS modules return empty objects in test environments without a bundler.
 * These tests focus on:
 * 1. Function execution without errors
 * 2. Proper handling of variant props
 * 3. Custom class appending behavior
 * 4. Return type structure
 */
describe('accordionVariants', () => {
	describe('function structure', () => {
		test('returns object with all expected methods', () => {
			const variants = accordionVariants();

			expect(typeof variants.root).toBe('function');
			expect(typeof variants.item).toBe('function');
			expect(typeof variants.trigger).toBe('function');
			expect(typeof variants.icon).toBe('function');
			expect(typeof variants.arrowOpen).toBe('function');
			expect(typeof variants.arrowClose).toBe('function');
			expect(typeof variants.content).toBe('function');
			expect(typeof variants.contentInner).toBe('function');
		});

		test('all methods return strings', () => {
			const variants = accordionVariants();

			expect(typeof variants.root()).toBe('string');
			expect(typeof variants.item()).toBe('string');
			expect(typeof variants.trigger()).toBe('string');
			expect(typeof variants.icon()).toBe('string');
			expect(typeof variants.arrowOpen()).toBe('string');
			expect(typeof variants.arrowClose()).toBe('string');
			expect(typeof variants.content()).toBe('string');
			expect(typeof variants.contentInner()).toBe('string');
		});
	});

	describe('variant props handling', () => {
		test('accepts empty props object', () => {
			expect(() => accordionVariants({})).not.toThrow();
		});

		test('accepts undefined props', () => {
			expect(() => accordionVariants()).not.toThrow();
		});

		test('accepts default variant', () => {
			expect(() => accordionVariants({ variant: 'default' })).not.toThrow();
		});

		test('accepts bordered variant', () => {
			expect(() => accordionVariants({ variant: 'bordered' })).not.toThrow();
		});

		test('accepts medium size', () => {
			expect(() => accordionVariants({ size: 'medium' })).not.toThrow();
		});

		test('accepts small size', () => {
			expect(() => accordionVariants({ size: 'small' })).not.toThrow();
		});

		test('accepts all variant and size combinations', () => {
			const variants = ['default', 'bordered'] as const;
			const sizes = ['medium', 'small'] as const;

			for (const variant of variants) {
				for (const size of sizes) {
					expect(() => accordionVariants({ variant, size })).not.toThrow();
				}
			}
		});
	});

	describe('custom class appending', () => {
		test('appends custom class to root', () => {
			const variants = accordionVariants();
			const customClass = 'my-custom-class';
			const rootClass = variants.root({ class: customClass });

			expect(rootClass).toContain(customClass);
		});

		test('appends custom class to item', () => {
			const variants = accordionVariants();
			const customClass = 'my-item-class';
			const itemClass = variants.item({ class: customClass });

			expect(itemClass).toContain(customClass);
		});

		test('appends custom class to trigger', () => {
			const variants = accordionVariants();
			const customClass = 'my-trigger-class';
			const triggerClass = variants.trigger({ class: customClass });

			expect(triggerClass).toContain(customClass);
		});

		test('appends custom class to icon', () => {
			const variants = accordionVariants();
			const customClass = 'my-icon-class';
			const iconClass = variants.icon({ class: customClass });

			expect(iconClass).toContain(customClass);
		});

		test('appends custom class to arrowOpen', () => {
			const variants = accordionVariants();
			const customClass = 'my-arrow-class';
			const arrowClass = variants.arrowOpen({ class: customClass });

			expect(arrowClass).toContain(customClass);
		});

		test('appends custom class to arrowClose', () => {
			const variants = accordionVariants();
			const customClass = 'my-arrow-class';
			const arrowClass = variants.arrowClose({ class: customClass });

			expect(arrowClass).toContain(customClass);
		});

		test('appends custom class to content', () => {
			const variants = accordionVariants();
			const customClass = 'my-content-class';
			const contentClass = variants.content({ class: customClass });

			expect(contentClass).toContain(customClass);
		});

		test('appends custom class to contentInner', () => {
			const variants = accordionVariants();
			const customClass = 'my-inner-class';
			const contentInnerClass = variants.contentInner({ class: customClass });

			expect(contentInnerClass).toContain(customClass);
		});
	});

	describe('edge cases', () => {
		test('handles empty class option', () => {
			const variants = accordionVariants();
			const rootClass = variants.root({ class: '' });

			// Should not have trailing/leading spaces from empty class
			expect(rootClass.trim()).toBe(rootClass);
		});

		test('handles undefined options for all methods', () => {
			const variants = accordionVariants();

			expect(() => variants.root(undefined)).not.toThrow();
			expect(() => variants.item(undefined)).not.toThrow();
			expect(() => variants.trigger(undefined)).not.toThrow();
			expect(() => variants.icon(undefined)).not.toThrow();
			expect(() => variants.arrowOpen(undefined)).not.toThrow();
			expect(() => variants.arrowClose(undefined)).not.toThrow();
			expect(() => variants.content(undefined)).not.toThrow();
			expect(() => variants.contentInner(undefined)).not.toThrow();
		});
	});
});
