/**
 * Tests for the focusTrap Svelte action.
 *
 * Mirrors: packages/react/src/hooks/__tests__/use-focus-trap.test.tsx
 */

import { describe, expect, test } from 'vitest';
import { focusTrap } from '../focus-trap';

describe('focusTrap action', () => {
	describe('Rendering', () => {
		test('should return update and destroy methods', () => {
			const container = document.createElement('div');
			container.innerHTML = `
				<button data-testid="button-1">First</button>
				<input data-testid="input-1" type="text" />
				<button data-testid="button-2">Second</button>
			`;
			document.body.appendChild(container);

			const result = focusTrap(container, true);

			expect(result).toBeDefined();
			expect(typeof result.update).toBe('function');
			expect(typeof result.destroy).toBe('function');

			result.destroy();
			document.body.removeChild(container);
		});

		test('should render focusable elements within container', () => {
			const container = document.createElement('div');
			container.innerHTML = `
				<button data-testid="button-1">First</button>
				<input data-testid="input-1" type="text" />
				<button data-testid="button-2">Second</button>
			`;
			document.body.appendChild(container);

			const result = focusTrap(container, true);

			expect(container.querySelector('[data-testid="button-1"]')).toBeTruthy();
			expect(container.querySelector('[data-testid="input-1"]')).toBeTruthy();
			expect(container.querySelector('[data-testid="button-2"]')).toBeTruthy();

			result.destroy();
			document.body.removeChild(container);
		});
	});

	describe('Focus Trap Behavior', () => {
		test('should handle disabled state (enabled=false)', () => {
			const container = document.createElement('div');
			container.innerHTML = '<button>Button</button>';
			document.body.appendChild(container);

			const result = focusTrap(container, false);

			expect(result).toBeDefined();
			result.destroy();
			document.body.removeChild(container);
		});

		test('should handle container with no focusable elements', () => {
			const container = document.createElement('div');
			container.innerHTML = '<span>No focusable elements here</span>';
			document.body.appendChild(container);

			const result = focusTrap(container, true);

			expect(result).toBeDefined();
			result.destroy();
			document.body.removeChild(container);
		});

		test('should allow toggling trap behavior via update', () => {
			const container = document.createElement('div');
			container.innerHTML = `
				<button data-testid="button-1">First</button>
				<button data-testid="button-2">Second</button>
			`;
			document.body.appendChild(container);

			const result = focusTrap(container, false);

			// Enable
			result.update(true);
			// Disable
			result.update(false);

			result.destroy();
			document.body.removeChild(container);
		});
	});

	describe('Cleanup', () => {
		test('should clean up on destroy without errors', () => {
			const container = document.createElement('div');
			container.innerHTML = '<button>Button</button>';
			document.body.appendChild(container);

			const result = focusTrap(container, true);

			// Should not throw
			expect(() => result.destroy()).not.toThrow();
			document.body.removeChild(container);
		});

		test('should handle dynamic trap state changes (multiple enable/disable cycles)', () => {
			const container = document.createElement('div');
			container.innerHTML = '<button>Button</button>';
			document.body.appendChild(container);

			const result = focusTrap(container, true);

			// Enable → Disable → Enable → Disable
			result.update(false);
			result.update(true);
			result.update(false);
			result.update(true);

			result.destroy();
			document.body.removeChild(container);
		});
	});
});
