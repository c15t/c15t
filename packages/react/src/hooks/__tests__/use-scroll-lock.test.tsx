/**
 * Tests for the useScrollLock hook.
 *
 * @packageDocumentation
 */

import { useState } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { useScrollLock } from '../use-scroll-lock';

describe('useScrollLock', () => {
	// Component that uses the scroll lock hook
	const TestComponent = ({ shouldLock = true }: { shouldLock?: boolean }) => {
		useScrollLock(shouldLock);

		return (
			<div data-testid="scroll-lock-test">
				<p>Scroll lock test</p>
			</div>
		);
	};

	// Component with toggle for testing dynamic lock behavior
	const ToggleLockComponent = () => {
		const [locked, setLocked] = useState(false);
		useScrollLock(locked);

		return (
			<div>
				<button data-testid="toggle" onClick={() => setLocked((prev) => !prev)}>
					Toggle Lock ({locked ? 'locked' : 'unlocked'})
				</button>
				<div data-testid="content" style={{ height: '200vh' }}>
					<p>Scrollable content</p>
				</div>
			</div>
		);
	};

	describe('Rendering', () => {
		test('should render without errors when lock is enabled', async () => {
			render(<TestComponent shouldLock={true} />);

			await vi.waitFor(
				() => {
					const component = document.querySelector(
						'[data-testid="scroll-lock-test"]'
					);
					expect(component).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('should render without errors when lock is disabled', async () => {
			render(<TestComponent shouldLock={false} />);

			await vi.waitFor(
				() => {
					const component = document.querySelector(
						'[data-testid="scroll-lock-test"]'
					);
					expect(component).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});
	});

	describe('Lock Behavior', () => {
		test('should allow toggling lock state', async () => {
			render(<ToggleLockComponent />);

			await vi.waitFor(
				() => {
					const toggle = document.querySelector('[data-testid="toggle"]');
					expect(toggle).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);

			const toggle = document.querySelector('[data-testid="toggle"]');

			// Toggle on
			await userEvent.click(toggle!);
			expect(toggle?.textContent).toContain('locked');

			// Toggle off
			await userEvent.click(toggle!);
			expect(toggle?.textContent).toContain('unlocked');
		});
	});

	describe('Cleanup', () => {
		test('should handle dynamic lock state changes', async () => {
			// Test cleanup behavior via ToggleLockComponent
			render(<ToggleLockComponent />);

			await vi.waitFor(
				() => {
					const toggle = document.querySelector('[data-testid="toggle"]');
					expect(toggle).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);

			const toggle = document.querySelector('[data-testid="toggle"]');

			// Enable lock
			await userEvent.click(toggle!);
			expect(toggle?.textContent).toContain('locked');

			// Disable lock (should cleanup)
			await userEvent.click(toggle!);
			expect(toggle?.textContent).toContain('unlocked');

			// Re-enable lock (should work without issues)
			await userEvent.click(toggle!);
			expect(toggle?.textContent).toContain('locked');
		});
	});

	describe('Multiple Instances', () => {
		test('should handle multiple instances gracefully', async () => {
			const MultiInstance = () => {
				const [show, setShow] = useState(true);

				return (
					<div>
						<button data-testid="toggle" onClick={() => setShow((p) => !p)}>
							Toggle
						</button>
						<TestComponent shouldLock={true} />
						{show && <TestComponent shouldLock={true} />}
					</div>
				);
			};

			render(<MultiInstance />);

			await vi.waitFor(
				() => {
					const components = document.querySelectorAll(
						'[data-testid="scroll-lock-test"]'
					);
					expect(components.length).toBe(2);
				},
				{ timeout: 3000 }
			);

			// Remove one instance
			const toggle = document.querySelector('[data-testid="toggle"]');
			await userEvent.click(toggle!);

			await vi.waitFor(
				() => {
					const components = document.querySelectorAll(
						'[data-testid="scroll-lock-test"]'
					);
					expect(components.length).toBe(1);
				},
				{ timeout: 3000 }
			);
		});
	});
});
