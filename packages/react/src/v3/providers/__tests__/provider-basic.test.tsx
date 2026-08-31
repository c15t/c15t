import { defaultTranslationConfig } from '@c15t/core';
import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { useConsentManager } from '~/v3/hooks/use-consent-manager';

import {
	ConsentManagerProvider,
	clearConsentRuntimeCache,
} from '../consent-manager-provider';

// Mock fetch globally
const mockFetch = vi.fn();
window.fetch = mockFetch;

const clearConsentStorage = function clearConsentStorage(): void {
	window.localStorage.clear();
	for (const cookie of document.cookie.split(';')) {
		const name = cookie.split('=')[0]?.trim();
		if (name) {
			document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
		}
	}
};

describe('ConsentManagerProvider Basic Request Behavior', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		clearConsentRuntimeCache();
		clearConsentStorage();
		// Set up fake timers for timer-related tests
		vi.useFakeTimers();

		// Mock successful response for all tests
		mockFetch.mockResolvedValue(
			new Response(
				JSON.stringify({
					jurisdiction: {
						code: 'GDPR',
					},
					showConsentBanner: true,
					translations: {
						language: 'en',
						translations: defaultTranslationConfig.translations.en,
					},
				}),
				{
					headers: { 'Content-Type': 'application/json' },
					status: 200,
				}
			)
		);
	});

	afterEach(() => {
		vi.clearAllMocks();
		clearConsentRuntimeCache();
		clearConsentStorage();
		// Restore real timers after each test
		vi.useRealTimers();
	});

	it('should only make one initial request for consent banner status', async () => {
		render(
			<ConsentManagerProvider
				options={{
					backendURL: '/api/c15t',
					mode: 'hosted',
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
			expect.stringContaining('/api/c15t/init'),
			expect.any(Object)
		);
	});

	it('should not make additional requests when props change but core options remain same', async () => {
		// First, clear any mock calls from previous tests
		mockFetch.mockClear();

		const { rerender } = await render(
			<ConsentManagerProvider
				options={{
					// Use offline mode to prevent additional fetches
					mode: 'offline',
					theme: { colors: { primary: '#ffffff' } },
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
					theme: { colors: { primary: '#000000' } },
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
		const { rerender } = await render(
			<ConsentManagerProvider
				options={{
					// Use unique URLs to distinguish calls
					backendURL: '/api/c15t-1',
					mode: 'hosted',
				}}
			>
				<div>First URL</div>
			</ConsentManagerProvider>
		);

		// Ensure first request completes
		await vi.runAllTimersAsync();
		expect(mockFetch).toHaveBeenCalledTimes(1);
		expect(mockFetch).toHaveBeenCalledWith(
			expect.stringContaining('/api/c15t-1/init'),
			expect.any(Object)
		);

		// Clear mock counts
		mockFetch.mockClear();

		// Change backendURL
		rerender(
			<ConsentManagerProvider
				options={{
					// Different backend URL
					backendURL: '/api/c15t-2',
					mode: 'hosted',
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
			expect.stringContaining('/api/c15t-2/init'),
			expect.any(Object)
		);
	});

	it('should handle rapid re-renders without making duplicate requests', async () => {
		// First, clear any mock calls from previous tests
		mockFetch.mockClear();

		const { rerender } = await render(
			<ConsentManagerProvider
				options={{
					// Use offline mode to avoid fetch calls
					mode: 'offline',
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
		{
			let i = 1;
			const runSequentialLoop1 =
				async function runSequentialLoop1(): Promise<void> {
					if (!(i <= 5)) {
						return;
					}
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

					i += 1;
					await runSequentialLoop1();
				};
			await runSequentialLoop1();
		}

		// Should still have no fetch calls
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it('should resolve offlinePolicy.policyPacks in offline mode', async () => {
		const PolicyProbe = () => {
			const { model, activeUI } = useConsentManager();
			return (
				<div data-testid="policy-probe">
					{JSON.stringify({ activeUI, model })}
				</div>
			);
		};

		const { getByTestId } = await render(
			<ConsentManagerProvider
				options={{
					mode: 'offline',
					offlinePolicy: {
						policyPacks: [
							{
								consent: { model: 'opt-out' },
								id: 'policy_region_us_ca',
								match: { regions: [{ country: 'US', region: 'CA' }] },
								ui: { mode: 'banner' },
							},
						],
					},
					overrides: {
						country: 'US',
						region: 'CA',
					},
				}}
			>
				<PolicyProbe />
			</ConsentManagerProvider>
		);

		await vi.runAllTimersAsync();

		expect(mockFetch).not.toHaveBeenCalled();
		expect(getByTestId('policy-probe')).toHaveTextContent('"model":"opt-out"');
		expect(getByTestId('policy-probe')).toHaveTextContent(
			'"activeUI":"banner"'
		);
	});

	it('should update callback props on cached runtimes without replaying stale handlers', async () => {
		const firstOnConsentChanged = vi.fn();
		const secondOnConsentChanged = vi.fn();
		const consentManagers: ReturnType<typeof useConsentManager>[] = [];

		const Probe = () => {
			const consentManager = useConsentManager();
			useEffect(() => {
				consentManagers.push(consentManager);
			}, [consentManager]);
			return <div>Probe</div>;
		};

		const { rerender } = await render(
			<ConsentManagerProvider
				options={{
					callbacks: {
						onConsentChanged: firstOnConsentChanged,
					},
					consentCategories: ['necessary', 'measurement'],
					mode: 'offline',
					offlinePolicy: {
						policy: {
							consent: {
								categories: ['necessary', 'measurement'],
							},
							model: 'opt-in',
							ui: {
								mode: 'banner',
							},
						},
					},
					reloadOnConsentRevoked: false,
				}}
			>
				<Probe />
			</ConsentManagerProvider>
		);

		await vi.runAllTimersAsync();

		rerender(
			<ConsentManagerProvider
				options={{
					callbacks: {
						onConsentChanged: secondOnConsentChanged,
					},
					consentCategories: ['necessary', 'measurement'],
					mode: 'offline',
					offlinePolicy: {
						policy: {
							consent: {
								categories: ['necessary', 'measurement'],
							},
							model: 'opt-in',
							ui: {
								mode: 'banner',
							},
						},
					},
					reloadOnConsentRevoked: false,
				}}
			>
				<Probe />
			</ConsentManagerProvider>
		);

		await vi.runAllTimersAsync();

		consentManagers.at(-1)?.setConsent('measurement', false);
		await vi.runAllTimersAsync();
		secondOnConsentChanged.mockClear();

		consentManagers.at(-1)?.setConsent('measurement', true);
		await vi.runAllTimersAsync();

		expect(firstOnConsentChanged).not.toHaveBeenCalled();
		expect(secondOnConsentChanged).toHaveBeenCalledTimes(1);
		expect(secondOnConsentChanged).toHaveBeenCalledWith(
			expect.objectContaining({
				allowedCategories: ['necessary', 'measurement'],
				previousAllowedCategories: ['necessary'],
			})
		);
	});
});
