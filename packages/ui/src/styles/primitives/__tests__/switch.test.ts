import { describe, expect, test } from 'vitest';
import { switchVariants } from '../switch';

/**
 * Note: CSS modules return empty objects in test environments without a bundler.
 * These tests focus on:
 * 1. Function execution without errors
 * 2. Proper handling of variant props
 * 3. Custom class appending behavior
 * 4. Return type structure
 */
describe('switchVariants', () => {
	describe('function structure', () => {
		test('returns object with root, thumb, and track methods', () => {
			const variants = switchVariants();

			expect(typeof variants.root).toBe('function');
			expect(typeof variants.thumb).toBe('function');
			expect(typeof variants.track).toBe('function');
		});

		test('all methods return strings', () => {
			const variants = switchVariants();

			expect(typeof variants.root()).toBe('string');
			expect(typeof variants.thumb()).toBe('string');
			expect(typeof variants.track()).toBe('string');
		});
	});

	describe('size props handling', () => {
		test('accepts empty props object', () => {
			expect(() => switchVariants({})).not.toThrow();
		});

		test('accepts undefined props', () => {
			expect(() => switchVariants()).not.toThrow();
		});

		test('accepts medium size', () => {
			expect(() => switchVariants({ size: 'medium' })).not.toThrow();
		});

		test('accepts small size', () => {
			expect(() => switchVariants({ size: 'small' })).not.toThrow();
		});
	});

	describe('custom class appending', () => {
		test('appends custom class to root', () => {
			const variants = switchVariants();
			const customClass = 'my-custom-class';
			const rootClass = variants.root({ class: customClass });

			expect(rootClass).toContain(customClass);
		});

		test('appends custom class to thumb', () => {
			const variants = switchVariants();
			const customClass = 'my-thumb-class';
			const thumbClass = variants.thumb({ class: customClass });

			expect(thumbClass).toContain(customClass);
		});

		test('appends custom class to track', () => {
			const variants = switchVariants();
			const customClass = 'my-track-class';
			const trackClass = variants.track({ class: customClass });

			expect(trackClass).toContain(customClass);
		});
	});

	describe('disabled state handling', () => {
		test('thumb accepts disabled option', () => {
			const variants = switchVariants();
			expect(() => variants.thumb({ disabled: true })).not.toThrow();
			expect(() => variants.thumb({ disabled: false })).not.toThrow();
		});

		test('track accepts disabled option', () => {
			const variants = switchVariants();
			expect(() => variants.track({ disabled: true })).not.toThrow();
			expect(() => variants.track({ disabled: false })).not.toThrow();
		});

		test('disabled and custom class together for thumb', () => {
			const variants = switchVariants();
			const customClass = 'extra-styles';
			const thumbClass = variants.thumb({ disabled: true, class: customClass });

			expect(thumbClass).toContain(customClass);
		});

		test('disabled and custom class together for track', () => {
			const variants = switchVariants();
			const customClass = 'extra-styles';
			const trackClass = variants.track({ disabled: true, class: customClass });

			expect(trackClass).toContain(customClass);
		});
	});

	describe('edge cases', () => {
		test('handles empty class option', () => {
			const variants = switchVariants();
			const rootClass = variants.root({ class: '' });

			// Should not have trailing/leading spaces from empty class
			expect(rootClass.trim()).toBe(rootClass);
		});

		test('handles undefined options for root', () => {
			const variants = switchVariants();
			expect(() => variants.root(undefined)).not.toThrow();
		});

		test('handles undefined options for thumb', () => {
			const variants = switchVariants();
			expect(() => variants.thumb(undefined)).not.toThrow();
		});

		test('handles undefined options for track', () => {
			const variants = switchVariants();
			expect(() => variants.track(undefined)).not.toThrow();
		});
	});
});
