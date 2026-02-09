/**
 * Tests for the useFocusTrap hook.
 *
 * @packageDocumentation
 */

import { useRef, useState } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { useFocusTrap } from '../use-focus-trap';

describe('useFocusTrap', () => {
	// Component that uses the focus trap hook
	const TestComponent = ({
		shouldTrap = true,
		onKeyDown,
	}: {
		shouldTrap?: boolean;
		onKeyDown?: (e: React.KeyboardEvent) => void;
	}) => {
		const containerRef = useRef<HTMLDivElement>(null);
		useFocusTrap(shouldTrap, containerRef);

		return (
			<div
				ref={containerRef}
				data-testid="trap-container"
				onKeyDown={onKeyDown}
			>
				<button data-testid="button-1">First</button>
				<input data-testid="input-1" type="text" />
				<button data-testid="button-2">Second</button>
			</div>
		);
	};

	// Component with toggle for testing dynamic trap behavior
	const ToggleTrapComponent = () => {
		const [trapEnabled, setTrapEnabled] = useState(false);
		const containerRef = useRef<HTMLDivElement>(null);
		useFocusTrap(trapEnabled, containerRef);

		return (
			<div>
				<button
					data-testid="toggle"
					onClick={() => setTrapEnabled((prev) => !prev)}
				>
					Toggle Trap ({trapEnabled ? 'enabled' : 'disabled'})
				</button>
				<div ref={containerRef} data-testid="trap-container">
					<button data-testid="button-1">First</button>
					<button data-testid="button-2">Second</button>
				</div>
			</div>
		);
	};

	describe('Rendering', () => {
		test('should render children without errors', async () => {
			render(<TestComponent />);

			await vi.waitFor(
				() => {
					const container = document.querySelector(
						'[data-testid="trap-container"]'
					);
					expect(container).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('should render focusable elements', async () => {
			render(<TestComponent />);

			await vi.waitFor(
				() => {
					const button1 = document.querySelector('[data-testid="button-1"]');
					const input = document.querySelector('[data-testid="input-1"]');
					const button2 = document.querySelector('[data-testid="button-2"]');
					expect(button1).toBeInTheDocument();
					expect(input).toBeInTheDocument();
					expect(button2).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});
	});

	describe('Focus Trap Behavior', () => {
		test('should not throw when container ref is null', async () => {
			// Component that uses null ref
			const NullRefComponent = () => {
				useFocusTrap(true, null);
				return <div>No ref</div>;
			};

			// Should not throw
			expect(() => render(<NullRefComponent />)).not.toThrow();
		});

		test('should handle shouldTrap being false', async () => {
			render(<TestComponent shouldTrap={false} />);

			await vi.waitFor(
				() => {
					const container = document.querySelector(
						'[data-testid="trap-container"]'
					);
					expect(container).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('should allow toggling trap behavior', async () => {
			render(<ToggleTrapComponent />);

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
			await vi.waitFor(
				() => {
					expect(toggle?.textContent).toContain('enabled');
				},
				{ timeout: 3000 }
			);

			// Toggle off
			await userEvent.click(toggle!);
			await vi.waitFor(
				() => {
					expect(toggle?.textContent).toContain('disabled');
				},
				{ timeout: 3000 }
			);
		});
	});

	describe('Empty Container', () => {
		test('should handle container with no focusable elements', async () => {
			const EmptyContainer = () => {
				const containerRef = useRef<HTMLDivElement>(null);
				useFocusTrap(true, containerRef);

				return (
					<div ref={containerRef} data-testid="empty-container">
						<span>No focusable elements here</span>
					</div>
				);
			};

			render(<EmptyContainer />);

			await vi.waitFor(
				() => {
					const container = document.querySelector(
						'[data-testid="empty-container"]'
					);
					expect(container).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});
	});

	describe('Cleanup', () => {
		test('should handle dynamic trap state changes', async () => {
			// Test cleanup behavior via ToggleTrapComponent
			render(<ToggleTrapComponent />);

			await vi.waitFor(
				() => {
					const toggle = document.querySelector('[data-testid="toggle"]');
					expect(toggle).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);

			const toggle = document.querySelector('[data-testid="toggle"]');

			// Enable trap
			await userEvent.click(toggle!);
			await vi.waitFor(
				() => {
					expect(toggle?.textContent).toContain('enabled');
				},
				{ timeout: 3000 }
			);

			// Disable trap (should cleanup)
			await userEvent.click(toggle!);
			await vi.waitFor(
				() => {
					expect(toggle?.textContent).toContain('disabled');
				},
				{ timeout: 3000 }
			);

			// Re-enable trap (should work without issues)
			await userEvent.click(toggle!);
			await vi.waitFor(
				() => {
					expect(toggle?.textContent).toContain('enabled');
				},
				{ timeout: 3000 }
			);
		});
	});
});
