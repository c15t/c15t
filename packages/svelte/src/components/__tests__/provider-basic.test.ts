/**
 * Tests for ConsentProvider basic request behavior.
 *
 * Mirrors: packages/react/src/providers/__tests__/provider-basic.test.tsx
 */

import { render } from '@testing-library/svelte';
import { clearConsentRuntimeCache } from 'c15t';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import ContextConsumerFixture from '../../__tests__/fixtures/context-consumer-fixture.svelte';
import ProviderOnlyFixture from '../../__tests__/fixtures/provider-only-fixture.svelte';

const mockFetch = vi.fn();
window.fetch = mockFetch;

describe('ConsentProvider Basic Request Behavior', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		clearConsentRuntimeCache();

		mockFetch.mockResolvedValue(
			new Response(
				JSON.stringify({
					showConsentBanner: true,
					jurisdiction: { code: 'GDPR' },
				}),
				{
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				}
			)
		);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	test('should not make fetch calls in offline mode', async () => {
		mockFetch.mockClear();

		render(ProviderOnlyFixture, {
			options: {
				mode: 'offline',
			},
		});

		await new Promise((resolve) => setTimeout(resolve, 100));

		expect(mockFetch).not.toHaveBeenCalled();
	});

	test('should not make additional requests when theme changes but mode remains same', async () => {
		mockFetch.mockClear();

		render(ProviderOnlyFixture, {
			options: {
				mode: 'offline',
				theme: { slots: { bannerCard: 'light' } },
			},
		});

		await new Promise((resolve) => setTimeout(resolve, 100));

		// No fetch in offline mode
		expect(mockFetch).not.toHaveBeenCalled();
	});

	test('should resolve offlinePolicy.policyPacks in offline mode', async () => {
		const { getByTestId } = render(ContextConsumerFixture, {
			options: {
				mode: 'offline',
				offlinePolicy: {
					policyPacks: [
						{
							id: 'policy_region_us_ca',
							match: { regions: [{ country: 'US', region: 'CA' }] },
							consent: { model: 'opt-out' },
							ui: { mode: 'banner' },
						},
					],
				},
				overrides: {
					country: 'US',
					region: 'CA',
				},
			},
		});

		await new Promise((resolve) => setTimeout(resolve, 100));

		expect(mockFetch).not.toHaveBeenCalled();
		expect(getByTestId('model')).toHaveTextContent('opt-out');
		expect(getByTestId('active-ui')).toHaveTextContent('banner');
	});

	test('should call transport init once on initial mount', async () => {
		const init = vi.fn(async () => ({}));

		render(ProviderOnlyFixture, {
			options: {
				transport: {
					init,
					async save(payload) {
						return { ok: true, subjectId: payload.subjectId };
					},
				},
			},
		});

		await new Promise((resolve) => setTimeout(resolve, 100));

		expect(init).toHaveBeenCalledTimes(1);
	});
});
