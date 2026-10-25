/**
 * Tests for the useScrollLock hook.
 *
 * @packageDocumentation
 */

import { useState } from 'react';
import { describe, expect, onTestFinished, test, vi } from 'vitest';
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
					<div
						data-testid="fixed-offset"
						style={{
							height: 10,
							position: 'fixed',
							right: 'var(--c15t-scroll-lock-gap, 0px)',
							top: 20,
							width: 10,
						}}
					/>
				</>
			);
		};

		const measure = () => ({
			fixedOffsetRight: getDefined(
				document.querySelector('[data-testid="fixed-offset"]')
			).getBoundingClientRect().right,
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
			// A `::-webkit-scrollbar` scrollbar always takes width in Chromium.
			// On macOS no `scrollbar-gutter` holds it, so the lock pads <body>
			// instead; on Linux the gutter holds and nothing moves.
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
			const locked = measure();
			expect(locked.flowRight).toBe(before.flowRight);
			// Padding cannot hold a fixed element; the gap variable can.
			expect(locked.fixedOffsetRight).toBe(before.fixedOffsetRight);

			await screen.rerender(
				<Page
					locked={false}
					styledScrollbar
				/>
			);
			expect(measure()).toEqual(before);
		});
		test.each(['1', '2'])(
			'reports the padded width so fixed elements can stay still at zoom %s',
			async (zoom) => {
				// Without `scrollbar-gutter`, the lock always pads <body>, on every
				// platform. Zoom scales the padding it sets, so it must not count
				// the scrollbar twice.
				vi.spyOn(CSS, 'supports').mockReturnValue(false);
				document.documentElement.style.zoom = zoom;
				onTestFinished(() => {
					vi.restoreAllMocks();
					document.documentElement.style.removeProperty('zoom');
				});
				const screen = await render(
					<Page
						locked={false}
						styledScrollbar
					/>
				);
				const before = measure();

				await screen.rerender(
					<Page
						locked
						styledScrollbar
					/>
				);
				const locked = measure();
				expect(locked.fixedRight).toBeGreaterThan(before.fixedRight);
				expect(locked.fixedOffsetRight).toBe(before.fixedOffsetRight);
				expect(locked.flowRight).toBe(before.flowRight);

				await screen.rerender(
					<Page
						locked={false}
						styledScrollbar
					/>
				);
				expect(measure()).toEqual(before);
			}
		);
	});

	describe('Scrolling', () => {
		const Page = ({ locked }: { locked: boolean }) => {
			useScrollLock(locked);

			return (
				<>
					<header
						data-testid="sticky"
						style={{ height: 40, position: 'sticky', top: 0 }}
					/>
					<div
						data-testid="flow"
						style={{ height: '400vh' }}
					/>
				</>
			);
		};

		const stickyTop = () =>
			getDefined(
				document.querySelector('[data-testid="sticky"]')
			).getBoundingClientRect().top;

		test('keeps the scroll position and sticky elements, and stops the wheel', async () => {
			const screen = await render(<Page locked={false} />);
			window.scrollTo(0, 500);
			expect(window.scrollY).toBe(500);
			expect(stickyTop()).toBe(0);

			await screen.rerender(<Page locked />);
			expect(window.scrollY).toBe(500);
			expect(stickyTop()).toBe(0);

			const flow = getDefined(document.querySelector('[data-testid="flow"]'));
			await userEvent.wheel(flow, { delta: { y: 400 } });
			// A blocked wheel leaves no event to wait for. Give an unblocked one
			// time to scroll the page.
			await new Promise((resolve) => {
				setTimeout(resolve, 200);
			});
			expect(window.scrollY).toBe(500);

			await screen.rerender(<Page locked={false} />);
			expect(window.scrollY).toBe(500);
			expect(stickyTop()).toBe(0);
			window.scrollTo(0, 0);
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
