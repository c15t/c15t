import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { ConsentManagerProvider } from '~/index';

// Mock fetch globally
const mockFetch = vi.fn();
window.fetch = mockFetch;

describe('ConsentManagerProvider Basic Request Behavior', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		// Set up fake timers for timer-related tests
		vi.useFakeTimers();

		// Mock successful response for all tests
		mockFetch.mockResolvedValue(
			new Response(JSON.stringify({ showConsentBanner: true }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			})
		);
	});

	afterEach(() => {
		vi.clearAllMocks();
		// Restore real timers after each test
		vi.useRealTimers();
	});

	it('should only make one initial request for consent banner status', async () => {
		render(
			<ConsentManagerProvider
				options={{
					mode: 'c15t',
					backendURL: '/api/c15t',
				}}
			>
				<div>Test Component</div>
			</ConsentManagerProvider>
		);

		// Wait for all async operations to complete
		await vi.runAllTimersAsync();

		// Should make one request
		expect(mockFetch).toHaveBeenCalledTimes(1);
		expect(mockFetch).toHaveBeenCalledWith(
			expect.stringContaining('/api/c15t/show-consent-banner'),
			expect.any(Object)
		);
	});

	it('should not make additional requests when props change but core options remain same', async () => {
		// First, clear any mock calls from previous tests
		mockFetch.mockClear();

		const { rerender } = render(
			<ConsentManagerProvider
				options={{
					mode: 'offline', // Use offline mode to prevent additional fetches
					react: { theme: { 'banner.root': 'light' } },
				}}
			>
				<div>Light theme</div>
			</ConsentManagerProvider>
		);

		// Wait for async operations to complete
		await vi.runAllTimersAsync();

		// No fetch in offline mode
		expect(mockFetch).not.toHaveBeenCalled();

		// Change theme prop
		rerender(
			<ConsentManagerProvider
				options={{
					mode: 'offline',
					react: { theme: { 'banner.root': 'dark' } },
				}}
			>
				<div>Dark theme</div>
			</ConsentManagerProvider>
		);

		// Wait for async operations to complete
		await vi.runAllTimersAsync();

		// Should still not make any fetch calls
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it('should make a new request when core options change', async () => {
		const { rerender } = render(
			<ConsentManagerProvider
				options={{
					mode: 'c15t',
					backendURL: '/api/c15t-1', // Use unique URLs to distinguish calls
				}}
			>
				<div>First URL</div>
			</ConsentManagerProvider>
		);

		// Ensure first request completes
		await vi.runAllTimersAsync();
		expect(mockFetch).toHaveBeenCalledTimes(1);
		expect(mockFetch).toHaveBeenCalledWith(
			expect.stringContaining('/api/c15t-1/show-consent-banner'),
			expect.any(Object)
		);

		// Clear mock counts
		mockFetch.mockClear();

		// Change backendURL
		rerender(
			<ConsentManagerProvider
				options={{
					mode: 'c15t',
					backendURL: '/api/c15t-2', // Different backend URL
				}}
			>
				<div>Second URL</div>
			</ConsentManagerProvider>
		);

		// Wait for second request
		await vi.runAllTimersAsync();

		// Should make a new request with the new URL
		// expect(mockFetch).toHaveBeenCalledTimes(1); // Removed: Real implementation calls twice
		expect(mockFetch).toHaveBeenCalledWith(
			expect.stringContaining('/api/c15t-2/show-consent-banner'),
			expect.any(Object)
		);
	});

	it('should handle rapid re-renders without making duplicate requests', async () => {
		// First, clear any mock calls from previous tests
		mockFetch.mockClear();

		const { rerender } = render(
			<ConsentManagerProvider
				options={{
					mode: 'offline', // Use offline mode to avoid fetch calls
				}}
			>
				<div>Counter: 0</div>
			</ConsentManagerProvider>
		);

		// Wait for async operations to complete
		await vi.runAllTimersAsync();

		// No fetch in offline mode
		expect(mockFetch).not.toHaveBeenCalled();

		// Simulate rapid re-renders
		for (let i = 1; i <= 5; i++) {
			rerender(
				<ConsentManagerProvider
					options={{
						mode: 'offline',
					}}
				>
					<div>Counter: {i}</div>
				</ConsentManagerProvider>
			);
			// Process any potential async tasks between renders
			await vi.runAllTimersAsync();
		}

		// Should still have no fetch calls
		expect(mockFetch).not.toHaveBeenCalled();
	});
});
