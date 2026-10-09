/**
 * `ConsentRoot` turns the mode in the state `loadConsent` returned into a
 * transport, or takes one through `mode`.
 */
import { custom } from '@c15t/core';
import { render } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import ConsentRoot from '../../lib/components/consent-root.svelte';

const mockFetch = vi.fn();
window.fetch = mockFetch;

type WindowWithC15t = Window & { c15t?: { mode: string } };

const initResponse = () =>
	new Response(JSON.stringify({ branding: 'c15t' }), {
		headers: { 'Content-Type': 'application/json' },
		status: 200,
	});

describe('ConsentRoot', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockFetch.mockImplementation(() => Promise.resolve(initResponse()));
	});

	afterEach(() => {
		delete (window as WindowWithC15t).c15t;
	});

	test('re-inits a manifest() page through the consent route', async () => {
		const result = render(ConsentRoot, {
			state: {
				backendURL: 'https://consent.example.com',
				mode: { type: 'manifest' },
				prefetch: {},
				routePrefix: '/api/c15t',
			},
		});

		await vi.waitFor(() => {
			expect(String(mockFetch.mock.calls[0]?.[0])).toMatch(
				/^\/api\/c15t\/init/u
			);
		});
		expect((window as WindowWithC15t).c15t?.mode).toBe('manifest');
		result.unmount();
	});

	test("asks the backend's /init for a hosted() page", async () => {
		const result = render(ConsentRoot, {
			state: {
				backendURL: 'https://consent.example.com',
				mode: { backendURL: 'https://consent.example.com', type: 'hosted' },
				prefetch: {},
			},
		});

		await vi.waitFor(() => {
			expect(String(mockFetch.mock.calls[0]?.[0])).toMatch(
				/^https:\/\/consent\.example\.com\/init/u
			);
		});
		expect((window as WindowWithC15t).c15t?.mode).toBe('hosted');
		result.unmount();
	});

	test('uses the transport passed as mode', async () => {
		const init = vi.fn(() => Promise.resolve({}));
		const result = render(ConsentRoot, {
			mode: custom({ init }),
			state: { mode: { type: 'manifest' }, prefetch: {} },
		});

		await vi.waitFor(() => {
			expect(init).toHaveBeenCalled();
		});
		expect(mockFetch).not.toHaveBeenCalled();
		result.unmount();
	});
});
