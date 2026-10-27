import {
	writePolicyResolutionWire,
	SAFE_FALLBACK_POLICY_FINGERPRINTS,
} from '@c15t/schema/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	matchedResolution,
	optInRule,
} from '../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../../kernel';
import { lazyHosted } from '../../runtime/client-mode';
import { withJourney } from '../../runtime/journey';
import {
	createBannerObservationReporter,
	observationPageId,
} from '../banner-observations';
import { createHostedTransport } from '../hosted';
import { createHostedInitRequest } from '../hosted-init-request';
import type { ProviderTransportContext } from '../mode';

const resolution = matchedResolution(optInRule());
const journey = {
	id: '12345678-1234-4123-a123-123456789abc',
	scope: 'tab',
	storedChoice: false,
} as const;
const payload = {
	observationEndpoint: 'https://consent.example/observations/banner',
	observationReceipt: 'opaque-browser-bound-receipt',
	policyResolution: writePolicyResolutionWire(resolution),
	translations: { language: 'en' },
};

describe('hosted browser observations', () => {
	let browser: EventTarget & { visibilityState: string };
	let windowEvents: EventTarget;
	const cleanup: (() => void)[] = [];
	beforeEach(() => {
		browser = Object.assign(new EventTarget(), { visibilityState: 'visible' });
		windowEvents = Object.assign(new EventTarget(), {
			location: { href: 'https://shop.example/' },
		});
		vi.stubGlobal('document', browser);
		vi.stubGlobal('window', windowEvents);
	});
	afterEach(() => {
		for (const dispose of cleanup.splice(0)) {
			dispose();
		}
		vi.unstubAllGlobals();
	});
	const setup = function setup(fail = false) {
		const requests: { url: string; body: Record<string, unknown> }[] = [];
		const fetch = vi.fn<typeof globalThis.fetch>((input, init) => {
			requests.push({
				body: JSON.parse(String(init?.body)),
				url: String(input),
			});
			if (fail) {
				return Promise.reject(new Error('Offline'));
			}
			return Promise.resolve(new Response('{}'));
		});
		const reporter = createBannerObservationReporter({
			backendURL: 'https://consent.example',
			fetch,
		});
		cleanup.push(reporter.dispose);
		return { reporter, requests };
	};

	it('uses one page ID per document, separately from an existing tab journey', () => {
		const first = observationPageId();
		const request = createHostedInitRequest({
			backendURL: 'https://consent.example',
			journey,
			overrides: {},
		});
		expect(new URL(request.url).searchParams.get('observationPageId')).toBe(
			first
		);
		expect(new URL(request.url).searchParams.get('journey')).toBe(journey.id);
		vi.stubGlobal(
			'document',
			Object.assign(new EventTarget(), { visibilityState: 'visible' })
		);
		expect(observationPageId()).not.toBe(first);
	});
	it('keeps the same document identity across independently loaded hosted chunks', async () => {
		const early = createHostedInitRequest({
			backendURL: 'https://consent.example',
			journey,
			overrides: {},
		});
		vi.resetModules();
		const separateChunk = await import('../hosted-init-request');
		const loaded = separateChunk.createHostedInitRequest({
			backendURL: 'https://consent.example',
			journey,
			overrides: {},
		});
		expect(loaded.url).toBe(early.url);
	});
	it('posts page evidence before a banner exists and requires the rendered language and policy for banner evidence', async () => {
		const { reporter, requests } = setup();
		reporter.setReceipt(payload, journey);
		await vi.waitFor(() => expect(requests).toHaveLength(1));
		expect(requests[0]?.body.event).toBe('page_seen');
		reporter.observe({
			event: 'banner_shown',
			language: 'fr',
			policyFingerprint: resolution.fingerprints.policy,
		});
		reporter.observe({
			event: 'banner_shown',
			language: 'en',
			policyFingerprint: 'wrong-policy',
		});
		await Promise.resolve();
		expect(requests).toHaveLength(1);
		reporter.observe({
			event: 'banner_shown',
			language: 'en',
			policyFingerprint: resolution.fingerprints.policy,
		});
		await vi.waitFor(() => expect(requests).toHaveLength(2));
		expect(requests[1]).toEqual({
			body: {
				event: 'banner_shown',
				journeyId: journey.id,
				journeyScope: 'tab',
				observedAt: expect.any(String),
				pageId: observationPageId(),
				receipt: payload.observationReceipt,
				visible: true,
			},
			url: payload.observationEndpoint,
		});
		windowEvents.dispatchEvent(new Event('online'));
		browser.dispatchEvent(new Event('visibilitychange'));
		await Promise.resolve();
		expect(requests).toHaveLength(2);
	});
	it('waits for a visible document and releases listeners on disposal', async () => {
		const { reporter, requests } = setup();
		browser.visibilityState = 'hidden';
		reporter.setReceipt(payload, journey);
		reporter.observe({
			event: 'banner_shown',
			language: 'en',
			policyFingerprint: resolution.fingerprints.policy,
		});
		await Promise.resolve();
		expect(requests).toEqual([]);
		browser.visibilityState = 'visible';
		browser.dispatchEvent(new Event('visibilitychange'));
		await vi.waitFor(() => expect(requests).toHaveLength(2));
		reporter.dispose();
		browser.dispatchEvent(new Event('visibilitychange'));
		await Promise.resolve();
		expect(requests).toHaveLength(2);
	});
	it('ignores absent, malformed, non-HTTPS and foreign credentials', async () => {
		const { reporter, requests } = setup();
		for (const value of [
			null,
			{},
			{ ...payload, observationReceipt: 12 },
			{
				...payload,
				observationEndpoint: 'https://other.example/observations/banner',
			},
			{
				...payload,
				observationEndpoint: 'http://consent.example/observations/banner',
			},
			{ ...payload, policyResolution: { status: 'failed' } },
		]) {
			reporter.setReceipt(value, journey);
		}
		await Promise.resolve();
		expect(requests).toEqual([]);
	});
	it('bounds network retries without affecting consent', async () => {
		const { reporter, requests } = setup(true);
		reporter.setReceipt(payload, journey);
		await vi.waitFor(() => expect(requests).toHaveLength(1));
		for (let attempt = 0; attempt < 5; attempt += 1) {
			// oxlint-disable-next-line no-await-in-loop -- Each network failure must settle before its next retry trigger.
			await new Promise((resolve) => {
				setTimeout(resolve, 0);
			});
			windowEvents.dispatchEvent(new Event('online'));
		}
		await vi.waitFor(() => expect(requests).toHaveLength(3));
	});
	it('rechecks buffered display evidence when a delayed receipt arrives', async () => {
		const { reporter, requests } = setup();
		let visible = true;
		reporter.observe({
			event: 'banner_shown',
			isVisible: () => visible,
			language: 'en',
			policyFingerprint: resolution.fingerprints.policy,
		});
		visible = false;
		reporter.setReceipt(payload, journey);
		await vi.waitFor(() => expect(requests).toHaveLength(1));
		expect(requests[0]?.body.event).toBe('page_seen');
		visible = true;
		windowEvents.dispatchEvent(new Event('online'));
		await vi.waitFor(() =>
			expect(requests[1]?.body.event).toBe('banner_shown')
		);
	});
	it('does not relabel an earlier unprobed display as a later receipt-bound observation', async () => {
		const { reporter, requests } = setup();
		reporter.observe({
			event: 'banner_shown',
			language: 'en',
			policyFingerprint: resolution.fingerprints.policy,
		});
		reporter.setReceipt(payload, journey);
		await vi.waitFor(() => expect(requests).toHaveLength(1));
		windowEvents.dispatchEvent(new Event('online'));
		await Promise.resolve();
		expect(requests.map((request) => request.body.event)).toEqual([
			'page_seen',
		]);
	});
	it('records the authoritative unconfigured fallback only after a matching rendered surface', async () => {
		const { reporter, requests } = setup();
		reporter.setReceipt(
			{
				...payload,
				policyResolution: writePolicyResolutionWire({
					policy: null,
					status: 'unconfigured',
				}),
			},
			journey
		);
		reporter.observe({
			event: 'banner_shown',
			language: 'en',
			policyFingerprint: resolution.fingerprints.policy,
		});
		await vi.waitFor(() => expect(requests).toHaveLength(1));
		reporter.observe({
			event: 'banner_shown',
			language: 'en',
			policyFingerprint: SAFE_FALLBACK_POLICY_FINGERPRINTS.policy,
		});
		await vi.waitFor(() => expect(requests).toHaveLength(2));
	});
	it('keeps kernel prompt intent separate from the rendered-surface transport', async () => {
		const observed: Record<string, unknown>[] = [];
		const fetch = vi.fn<typeof globalThis.fetch>((_input, init) => {
			if (init?.method === 'POST') {
				observed.push(JSON.parse(String(init.body)));
				return Promise.resolve(new Response('{}'));
			}
			return Promise.resolve(
				Response.json(
					{
						...payload,
						branding: 'c15t',
						location: { countryCode: 'DE', regionCode: null },
						translations: { language: 'en', translations: {} },
					},
					{ headers: { 'x-c15t-policy-contract': '1' } }
				)
			);
		});
		const hosted = createHostedTransport({
			backendURL: 'https://consent.example',
			fetch,
		});
		const kernel = createConsentKernel({
			transport: withJourney(hosted, {
				forInit: () => journey,
				forSave: () => ({ id: journey.id, scope: journey.scope }),
			}),
		});
		cleanup.push(() => kernel.dispose());
		await kernel.commands.init();
		await vi.waitFor(() => expect(observed).toHaveLength(1));
		expect(kernel.getSnapshot().activeUI).toBe('banner');
		expect(observed.map((event) => event.event)).toEqual(['page_seen']);
		kernel.reportBannerRendered?.({
			language: 'en',
			policyFingerprint: 'stale',
		});
		await Promise.resolve();
		expect(observed).toHaveLength(1);
		kernel.reportBannerRendered?.({
			language: 'en',
			policyFingerprint: resolution.fingerprints.policy,
		});
		await vi.waitFor(() =>
			expect(observed.map((event) => event.event)).toEqual([
				'page_seen',
				'banner_shown',
			])
		);
	});
	it('acquires an SSR capability only when visible and does not load the consent init chunk', async () => {
		browser.visibilityState = 'hidden';
		const sent: { url: string; body?: Record<string, unknown> }[] = [];
		vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => {
			sent.push({
				body: init?.body ? JSON.parse(String(init.body)) : undefined,
				url: String(input),
			});
			return Promise.resolve(Response.json(payload));
		});
		const factory = lazyHosted(
			{
				backendURL: 'https://consent.example',
				initURL: '/api/local-consent/init',
			},
			() => Promise.reject(new Error('Consent init must not load'))
		);
		const transport = factory({} as ProviderTransportContext);
		cleanup.push(() => transport.disposeObservations?.());
		transport.beginObservations?.(
			{ journey, overrides: {}, user: null },
			payload.observationEndpoint
		);
		await Promise.resolve();
		expect(sent).toEqual([]);
		browser.visibilityState = 'visible';
		browser.dispatchEvent(new Event('visibilitychange'));
		await vi.waitFor(() => expect(sent).toHaveLength(2));
		const receiptRequest = new URL(sent[0]?.url ?? '');
		expect(receiptRequest.pathname).toBe('/init');
		expect(receiptRequest.searchParams.get('observationPageId')).toBe(
			observationPageId()
		);
		expect(sent[1]?.body?.event).toBe('page_seen');
		transport.observe?.({
			event: 'banner_shown',
			language: 'en',
			policyFingerprint: resolution.fingerprints.policy,
		});
		await vi.waitFor(() => expect(sent[2]?.body?.event).toBe('banner_shown'));
	});
	it('does not revive disposed observation delivery when a receipt response finishes later', async () => {
		const sent: string[] = [];
		let release: ((value: Response) => void) | undefined;
		vi.stubGlobal('fetch', (input: RequestInfo | URL) => {
			sent.push(String(input));
			return new Promise<Response>((resolve) => {
				release = resolve;
			});
		});
		const transport = lazyHosted({ backendURL: 'https://consent.example' })(
			{} as ProviderTransportContext
		);
		transport.beginObservations?.(
			{ journey, overrides: {}, user: null },
			payload.observationEndpoint
		);
		transport.disposeObservations?.();
		release?.(Response.json(payload));
		await new Promise((resolve) => {
			setTimeout(resolve, 10);
		});
		browser.dispatchEvent(new Event('visibilitychange'));
		expect(sent).toHaveLength(1);
	});
	it('keeps prefetched receipts out of a different browser journey binding', async () => {
		const hosted = createHostedTransport({
			backendURL: 'https://consent.example',
			fetch: () => Promise.reject(new Error('Unexpected network')),
			initialData: Promise.resolve({
				init: {
					...payload,
					branding: 'c15t',
					location: { countryCode: 'DE', regionCode: null },
					translations: { language: 'en', translations: {} },
				},
				producerPolicyContract: '1',
			}),
		});
		cleanup.push(() => hosted.disposeObservations?.());
		const result = await hosted.init({ journey, overrides: {}, user: null });
		expect(result.observationReceipt).toBeUndefined();
		expect(result.observationEndpoint).toBe(payload.observationEndpoint);
	});
});
