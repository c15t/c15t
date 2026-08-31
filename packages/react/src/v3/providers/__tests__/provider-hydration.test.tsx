import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import {
	ConsentManagerProvider,
	clearConsentRuntimeCache,
} from '../consent-manager-provider';

// Mock a simple provider component
const MockSSRProvider = ({ children }: { children: ReactNode }) => (
	<div data-testid="ssr-provider">{children}</div>
);

// Component that tracks render timing
const RenderTracker = ({ label }: { label: string }) => (
	<div data-testid={`render-${label}`}>{label}</div>
);

describe('ConsentManagerProvider Hydration Behavior', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		vi.useFakeTimers();
		clearConsentRuntimeCache();
	});

	afterEach(() => {
		vi.clearAllMocks();
		vi.useRealTimers();
	});

	it('should render children immediately without blocking during hydration', async () => {
		const { getByTestId } = await render(
			<ConsentManagerProvider
				options={{
					consentCategories: ['necessary', 'marketing'],
					mode: 'offline',
				}}
			>
				<RenderTracker label="child" />
			</ConsentManagerProvider>
		);

		// Children should be visible immediately, even before timers advance
		expect(getByTestId('render-child')).toBeInTheDocument();
		expect(getByTestId('render-child')).toHaveTextContent('child');

		// Advance timers to allow async operations
		await vi.runAllTimersAsync();

		// Children should still be visible after hydration completes
		expect(getByTestId('render-child')).toBeInTheDocument();
	});

	it('should not block SSR provider content when ConsentManager wraps SSR provider', async () => {
		const { getByTestId } = await render(
			<ConsentManagerProvider
				options={{
					consentCategories: ['necessary', 'marketing'],
					mode: 'offline',
				}}
			>
				<MockSSRProvider>
					<RenderTracker label="ssr-content" />
				</MockSSRProvider>
			</ConsentManagerProvider>
		);

		// SSR content should be visible immediately
		expect(getByTestId('ssr-provider')).toBeInTheDocument();
		expect(getByTestId('render-ssr-content')).toBeInTheDocument();
		expect(getByTestId('render-ssr-content')).toHaveTextContent('ssr-content');

		// Advance timers
		await vi.runAllTimersAsync();

		// Content should still be visible after hydration
		expect(getByTestId('ssr-provider')).toBeInTheDocument();
		expect(getByTestId('render-ssr-content')).toBeInTheDocument();
	});

	it('should not block SSR provider content when SSR provider wraps ConsentManager', async () => {
		const { getByTestId } = await render(
			<MockSSRProvider>
				<ConsentManagerProvider
					options={{
						consentCategories: ['necessary', 'marketing'],
						mode: 'offline',
					}}
				>
					<RenderTracker label="nested-content" />
				</ConsentManagerProvider>
			</MockSSRProvider>
		);

		// Content should be visible immediately
		expect(getByTestId('ssr-provider')).toBeInTheDocument();
		expect(getByTestId('render-nested-content')).toBeInTheDocument();
		expect(getByTestId('render-nested-content')).toHaveTextContent(
			'nested-content'
		);

		// Advance timers
		await vi.runAllTimersAsync();

		// Content should still be visible after hydration
		expect(getByTestId('ssr-provider')).toBeInTheDocument();
		expect(getByTestId('render-nested-content')).toBeInTheDocument();
	});

	it('should handle rapid re-renders without blocking children', async () => {
		const { rerender, getByTestId } = await render(
			<ConsentManagerProvider
				options={{
					consentCategories: ['necessary'],
					mode: 'offline',
				}}
			>
				<RenderTracker label="rapid-render" />
			</ConsentManagerProvider>
		);

		// Initial render should be immediate
		expect(getByTestId('render-rapid-render')).toBeInTheDocument();

		// Simulate rapid re-renders
		{
			let i = 0;
			const runSequentialLoop1 =
				async function runSequentialLoop1(): Promise<void> {
					if (!(i < 3)) {
						return;
					}
					rerender(
						<ConsentManagerProvider
							options={{
								consentCategories: ['necessary', 'marketing'],
								mode: 'offline',
							}}
						>
							<RenderTracker label="rapid-render" />
						</ConsentManagerProvider>
					);

					// Children should remain visible during re-renders
					expect(getByTestId('render-rapid-render')).toBeInTheDocument();
					await vi.runAllTimersAsync();

					i += 1;
					await runSequentialLoop1();
				};
			await runSequentialLoop1();
		}
	});

	it('should use startTransition for non-blocking state updates during hydration', async () => {
		// Track if children render before state updates complete
		const childrenRendered = vi.fn();

		const TestComponent = () => {
			useEffect(() => {
				childrenRendered();
			}, []);
			return <div data-testid="hydration-test">Content</div>;
		};

		const { getByTestId } = await render(
			<ConsentManagerProvider
				options={{
					consentCategories: ['necessary'],
					mode: 'offline',
				}}
			>
				<TestComponent />
			</ConsentManagerProvider>
		);

		// Children should render immediately (before timers advance)
		expect(childrenRendered).toHaveBeenCalled();
		expect(getByTestId('hydration-test')).toBeInTheDocument();

		// Advance timers to allow state updates
		await vi.runAllTimersAsync();

		// Children should still be visible
		expect(getByTestId('hydration-test')).toBeInTheDocument();
	});
});
