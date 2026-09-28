/**
 * Tests for the useScrollLock hook.
 *
 * @packageDocumentation
 */

import { useState } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

import { useScrollLock } from '../use-scroll-lock';

const getDefined = <Value,>(
	value: Value,
	message = 'Expected value to be defined'
): NonNullable<Value> => {
	if (value === null || value === undefined) {
		throw new Error(message);
	}
	return value;
};

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
				<button
					data-testid="toggle"
					type="button"
					onClick={() => setLocked((prev) => !prev)}
				>
					Toggle Lock ({locked ? 'locked' : 'unlocked'})
				</button>
				<div
					data-testid="content"
					style={{ height: '200vh' }}
				>
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
			await userEvent.click(getDefined(toggle));
			await vi.waitFor(
				() => {
					expect(toggle?.textContent).toContain('locked');
				},
				{ timeout: 3000 }
			);

			// Toggle off
			await userEvent.click(getDefined(toggle));
			await vi.waitFor(
				() => {
					expect(toggle?.textContent).toContain('unlocked');
				},
				{ timeout: 3000 }
			);
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
			await userEvent.click(getDefined(toggle));
			await vi.waitFor(
				() => {
					expect(toggle?.textContent).toContain('locked');
				},
				{ timeout: 3000 }
			);

			// Disable lock (should cleanup)
			await userEvent.click(getDefined(toggle));
			await vi.waitFor(
				() => {
					expect(toggle?.textContent).toContain('unlocked');
				},
				{ timeout: 3000 }
			);

			// Re-enable lock (should work without issues)
			await userEvent.click(getDefined(toggle));
			await vi.waitFor(
				() => {
					expect(toggle?.textContent).toContain('locked');
				},
				{ timeout: 3000 }
			);
		});
	});

	describe('Layout', () => {
		const Page = ({
			locked,
			styledScrollbar = false,
		}: {
			locked: boolean;
			styledScrollbar?: boolean;
		}) => {
			useScrollLock(locked);

			return (
				<>
					{styledScrollbar && (
						<style>
							{
								'::-webkit-scrollbar { width: 15px; } ::-webkit-scrollbar-thumb { background: #999; }'
							}
						</style>
					)}
					<div
						data-testid="flow"
						style={{ height: '200vh' }}
					/>
					<div
						data-testid="fixed"
						style={{
							height: 10,
							position: 'fixed',
							right: 0,
							top: 0,
							width: 10,
						}}
					/>
				</>
			);
		};

		const measure = () => ({
			fixedRight: getDefined(
				document.querySelector('[data-testid="fixed"]')
			).getBoundingClientRect().right,
			flowRight: getDefined(
				document.querySelector('[data-testid="flow"]')
			).getBoundingClientRect().right,
		});

		const scrollbarWidth = () =>
			window.innerWidth - document.documentElement.clientWidth;

		test('keeps fixed and in-flow content still with a native scrollbar', async (context) => {
			const screen = await render(<Page locked={false} />);

			// The browser project launches Chromium with visible scrollbars, which
			// are classic on Linux. macOS may use overlay scrollbars, which take
			// no width and cannot shift anything, depending on the pointing
			// device connected.
			if (scrollbarWidth() === 0) {
				context.skip();
			}
			const before = measure();

			await screen.rerender(<Page locked />);
			expect(measure()).toEqual(before);

			await screen.rerender(<Page locked={false} />);
			expect(measure()).toEqual(before);
		});

		test('keeps in-flow content still with a styled scrollbar', async () => {
			// A `::-webkit-scrollbar` scrollbar always takes width in Chromium,
			// and reserves no `scrollbar-gutter`, so the lock pads <body> instead.
			const screen = await render(
				<Page
					locked={false}
					styledScrollbar
				/>
			);
			expect(scrollbarWidth()).toBeGreaterThan(0);
			const before = measure();

			await screen.rerender(
				<Page
					locked
					styledScrollbar
				/>
			);
			expect(measure().flowRight).toBe(before.flowRight);

			await screen.rerender(
				<Page
					locked={false}
					styledScrollbar
				/>
			);
			expect(measure()).toEqual(before);
		});
	});

	describe('Multiple Instances', () => {
		test('should handle multiple instances gracefully', async () => {
			const MultiInstance = () => {
				const [show, setShow] = useState(true);

				return (
					<div>
						<button
							data-testid="toggle"
							type="button"
							onClick={() => setShow((p) => !p)}
						>
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
			await userEvent.click(getDefined(toggle));

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
