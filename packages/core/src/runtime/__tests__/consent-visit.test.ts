/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockConsentBannerResponse } from '../../libs/init-consent-manager/__tests__/test-setup';
import {
	type ConsentRuntimeResult,
	clearConsentRuntimeCache,
	getOrCreateConsentRuntime,
} from '..';

describe('hosted consent visit integration', () => {
	const requests: { url: string; options?: RequestInit }[] = [];
	let trackingEnabled = true;
	let rejectAnalytics = false;
	const initData = () =>
		createMockConsentBannerResponse({
			...(trackingEnabled ? { visitTracking: { enabled: true } } : {}),
		});
	function visitEvents() {
		return requests
			.filter(({ url }) => url.includes('/consent/visits'))
			.map(({ options }) => JSON.parse(String(options?.body)));
	}
	beforeEach(() => {
		trackingEnabled = true;
		rejectAnalytics = false;
		requests.length = 0;
		window.localStorage.clear();
		for (const cookie of document.cookie.split(';')) {
			// biome-ignore lint/suspicious/noDocumentCookie: Clear jsdom consent cookies between tests.
			document.cookie = `${cookie.split('=')[0]}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
		}
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: string, options?: RequestInit) => {
				requests.push({ url, options });
				if (url.includes('/consent/visits')) {
					if (rejectAnalytics) throw new Error('Collector unavailable');
					return new Response(null, { status: 204 });
				}
				if (url.includes('/init')) return Response.json(initData());
				return Response.json({ success: true });
			})
		);
	});
	afterEach(() => {
		clearConsentRuntimeCache();
		vi.unstubAllGlobals();
	});

	it('starts from browser init, links a save, and shares a visit across cached provider remounts', async () => {
		const options = {
			mode: 'hosted' as const,
			backendURL: 'https://consent.example.com/customer',
		};
		const runtime = getOrCreateConsentRuntime(options);
		await vi.waitFor(() => expect(visitEvents()).toHaveLength(2));
		expect(visitEvents().map(({ event }) => event)).toEqual([
			'started',
			'state',
		]);
		const visitId = visitEvents()[0].visitId;
		expect(visitEvents()[0]).toMatchObject({ state: 'choice_required' });
		expect(getOrCreateConsentRuntime(options).consentStore).toBe(
			runtime.consentStore
		);
		await runtime.consentStore.getState().initConsentManager();
		expect(visitEvents()).toHaveLength(2);
		await runtime.consentStore.getState().saveConsents('all');
		const saves = requests.filter(({ url }) => url.includes('/subjects'));
		expect(saves).toHaveLength(1);
		expect(JSON.parse(String(saves[0]?.options?.body))).toMatchObject({
			metadata: { c15tVisitId: visitId },
		});
		expect(visitEvents()).toHaveLength(2);
		expect(
			requests
				.filter(({ url }) => url.includes('/consent/visits'))
				.every(
					({ url, options }) =>
						url === 'https://consent.example.com/customer/consent/visits' &&
						options?.credentials === 'omit' &&
						options.keepalive === true &&
						options.referrerPolicy === 'no-referrer'
				)
		).toBe(true);
	});

	it('starts from SSR or prefetched init without a browser init request', async () => {
		const runtime = getOrCreateConsentRuntime({
			mode: 'hosted',
			backendURL: 'https://consent.example.com',
			ssrData: Promise.resolve({ init: initData() }),
		});
		await vi.waitFor(() => expect(visitEvents()).toHaveLength(2));
		expect(requests.some(({ url }) => url.includes('/init'))).toBe(false);
		expect(runtime.consentStore.getState().ssrDataUsed).toBe(true);
		runtime.dispose();
		window.dispatchEvent(
			new PageTransitionEvent('pagehide', { persisted: false })
		);
		expect(visitEvents()).toHaveLength(2);
	});

	it('does not add analytics or visit metadata without backend opt-in', async () => {
		trackingEnabled = false;
		const runtime = getOrCreateConsentRuntime({
			mode: 'hosted',
			backendURL: 'https://consent.example.com',
		});
		await vi.waitFor(() =>
			expect(runtime.consentStore.getState().hasFetchedBanner).toBe(true)
		);
		await runtime.consentStore.getState().saveConsents('all');
		expect(visitEvents()).toEqual([]);
		const save = requests.find(({ url }) => url.includes('/subjects'));
		expect(save).toBeDefined();
		expect(JSON.parse(String(save?.options?.body))).not.toHaveProperty(
			'metadata'
		);
	});

	it('does not interrupt consent when optional telemetry fails', async () => {
		rejectAnalytics = true;
		const runtime = getOrCreateConsentRuntime({
			mode: 'hosted',
			backendURL: 'https://consent.example.com',
		});
		await vi.waitFor(() => expect(visitEvents()).toHaveLength(2));
		await runtime.consentStore.getState().saveConsents('all');
		expect(runtime.consentStore.getState().consentInfo).not.toBeNull();
		expect(
			requests.filter(({ url }) => url.includes('/subjects'))
		).toHaveLength(1);
		expect(visitEvents()).toHaveLength(2);
	});

	it('links a save from an init callback without changing the initial choice-required state', async () => {
		let runtime: ConsentRuntimeResult;
		runtime = getOrCreateConsentRuntime({
			mode: 'hosted',
			backendURL: 'https://consent.example.com',
			callbacks: {
				onBannerFetched: () => {
					void runtime.consentStore.getState().saveConsents('all');
				},
			},
		});
		await vi.waitFor(() =>
			expect(requests.some(({ url }) => url.includes('/subjects'))).toBe(true)
		);
		const visitId = visitEvents()[0].visitId;
		expect(visitEvents()[0].state).toBe('choice_required');
		const save = requests.find(({ url }) => url.includes('/subjects'));
		expect(JSON.parse(String(save?.options?.body))).toMatchObject({
			metadata: { c15tVisitId: visitId },
		});
	});

	it('keeps automatic GPC and opt-out decisions separate from saved choices', async () => {
		const runtime = getOrCreateConsentRuntime({
			mode: 'hosted',
			backendURL: 'https://consent.example.com',
			overrides: { gpc: true },
			ssrData: Promise.resolve({
				init: {
					...initData(),
					policy: {
						id: 'opt-out',
						model: 'opt-out',
						ui: { mode: 'none' },
						consent: { gpc: true },
					},
				},
			}),
		});
		await vi.waitFor(() => expect(visitEvents()).toHaveLength(2));
		expect(visitEvents()[0]).toMatchObject({
			state: 'not_required',
			policyId: 'opt-out',
		});
		expect(runtime.consentStore.getState().consentInfo).toBeNull();
		expect(runtime.consentStore.getState().consents.marketing).toBe(false);
		expect(requests.some(({ url }) => url.includes('/subjects'))).toBe(false);
	});
});
