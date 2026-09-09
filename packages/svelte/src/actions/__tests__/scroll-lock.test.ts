/**
 * Tests for the scrollLock Svelte action.
 *
 * Mirrors: packages/react/src/hooks/__tests__/use-scroll-lock.test.tsx
 */

import { describe, expect, test } from 'vitest';

import { scrollLock } from '../../lib/actions/scroll-lock';

describe('scrollLock action', () => {
	describe('Rendering', () => {
		test('should return update and destroy methods when enabled', () => {
			const node = document.createElement('div');
			const result = scrollLock(node, true);

			expect(result).toBeDefined();
			expect(typeof result.update).toBe('function');
			expect(typeof result.destroy).toBe('function');

			result.destroy();
		});

		test('should return update and destroy methods when disabled', () => {
			const node = document.createElement('div');
			const result = scrollLock(node, false);

			expect(result).toBeDefined();
			result.destroy();
		});
	});

	describe('Lock Behavior', () => {
		test('should allow toggling lock state via update', () => {
			const node = document.createElement('div');
			const result = scrollLock(node, false);

			// Enable lock
			result.update(true);
			expect(document.body.style.overflow).toBe('hidden');
			// Disable lock
			result.update(false);
			expect(document.body.style.overflow).not.toBe('hidden');

			result.destroy();
		});
	});

	describe('Cleanup', () => {
		test('should clean up on destroy without errors', () => {
			const node = document.createElement('div');
			const result = scrollLock(node, true);

			expect(() => result.destroy()).not.toThrow();
		});

		test('should handle dynamic lock state changes (multiple enable/disable cycles)', () => {
			const node = document.createElement('div');
			const result = scrollLock(node, false);

			result.update(true);
			expect(document.body.style.overflow).toBe('hidden');
			result.update(false);
			expect(document.body.style.overflow).not.toBe('hidden');
			result.update(true);
			expect(document.body.style.overflow).toBe('hidden');
			result.update(false);
			expect(document.body.style.overflow).not.toBe('hidden');

			result.destroy();
		});

		test('restores scrolling after nested locks are destroyed in reverse order', () => {
			const node1 = document.createElement('div');
			const node2 = document.createElement('div');

			const result1 = scrollLock(node1, true);
			const result2 = scrollLock(node2, true);

			// Closing the inner lock leaves the outer lock active.
			result2.destroy();
			expect(document.body.style.overflow).toBe('hidden');
			result1.destroy();
			expect(document.body.style.overflow).not.toBe('hidden');
		});
	});
});
