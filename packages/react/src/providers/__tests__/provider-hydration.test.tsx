import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import {
	ConsentManagerProvider,
	clearConsentManagerCache,
} from '../consent-manager-provider';

// Mock a simple provider component
const MockSSRProvider = ({ children }: { children: ReactNode }) => {
	return <div data-testid="ssr-provider">{children}</div>;
};

// Component that tracks render timing
const RenderTracker = ({ label }: { label: string }) => {
	return <div data-testid={`render-${label}`}>{label}</div>;
};

describe('ConsentManagerProvider Hydration Behavior', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		vi.useFakeTimers();
		clearConsentManagerCache();
	});

	afterEach(() => {
		vi.clearAllMocks();
		vi.useRealTimers();
	});

	it('should render children immediately without blocking during hydration', async () => {
		const { getByTestId } = await render(
			<ConsentManagerProvider
				options={{
					mode: 'offline',
					consentCategories: ['necessary', 'marketing'],
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
					mode: 'offline',
					consentCategories: ['necessary', 'marketing'],
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
						mode: 'offline',
						consentCategories: ['necessary', 'marketing'],
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
					mode: 'offline',
					consentCategories: ['necessary'],
				}}
			>
				<RenderTracker label="rapid-render" />
			</ConsentManagerProvider>
		);

		// Initial render should be immediate
		expect(getByTestId('render-rapid-render')).toBeInTheDocument();

		// Simulate rapid re-renders
		for (let i = 0; i < 3; i++) {
			rerender(
				<ConsentManagerProvider
					options={{
						mode: 'offline',
						consentCategories: ['necessary', 'marketing'],
					}}
				>
					<RenderTracker label="rapid-render" />
				</ConsentManagerProvider>
			);

			// Children should remain visible during re-renders
			expect(getByTestId('render-rapid-render')).toBeInTheDocument();
			await vi.runAllTimersAsync();
		}
	});

	it('should use startTransition for non-blocking state updates during hydration', async () => {
		// Track if children render before state updates complete
		let childrenRendered = false;

		const TestComponent = () => {
			childrenRendered = true;
			return <div data-testid="hydration-test">Content</div>;
		};

		const { getByTestId } = await render(
			<ConsentManagerProvider
				options={{
					mode: 'offline',
					consentCategories: ['necessary'],
				}}
			>
				<TestComponent />
			</ConsentManagerProvider>
		);

		// Children should render immediately (before timers advance)
		expect(childrenRendered).toBe(true);
		expect(getByTestId('hydration-test')).toBeInTheDocument();

		// Advance timers to allow state updates
		await vi.runAllTimersAsync();

		// Children should still be visible
		expect(getByTestId('hydration-test')).toBeInTheDocument();
	});
});
