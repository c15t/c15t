/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockConsentBannerResponse } from '../../libs/init-consent-manager/__tests__/test-setup';
import {
	buildPrefetchScript,
	primePrefetchedInitialData,
} from '../../libs/prefetch/prefetch';
import {
	type ConsentRuntimeResult,
	clearConsentRuntimeCache,
	getOrCreateConsentRuntime,
} from '..';

const backendURL = 'https://consent.example.com/customer';
const responseId = 'ac2025bb-d674-4f94-b528-4f4b48bf7806';

describe('hosted init consent correlation', () => {
	const requests: { url: string; options?: RequestInit }[] = [];
	let trackingEnabled = true;
	let mismatchedEcho = false;
	let failedInitAttempts = 0;
	const initData = (visitId = responseId) =>
		createMockConsentBannerResponse({
			...(trackingEnabled ? { visitTracking: { enabled: true, visitId } } : {}),
		});
	const inits = () => requests.filter(({ url }) => url.includes('/init'));
	const saves = () => requests.filter(({ url }) => url.includes('/subjects'));
	const body = (request: (typeof requests)[number] | undefined) =>
		JSON.parse(String(request?.options?.body));
	const waitForInit = async (runtime: ConsentRuntimeResult) => {
		await vi.waitFor(
			() => expect(runtime.consentStore.getState().hasFetchedBanner).toBe(true),
			{ timeout: 5_000 }
		);
	};
	beforeEach(() => {
		trackingEnabled = true;
		mismatchedEcho = false;
		failedInitAttempts = 0;
		requests.length = 0;
		window.localStorage.clear();
		delete (window as Window & { __c15tInitialDataPromises?: unknown })
			.__c15tInitialDataPromises;
		for (const cookie of document.cookie.split(';')) {
			// biome-ignore lint/suspicious/noDocumentCookie: Clear jsdom consent cookies between tests.
			document.cookie = `${cookie.split('=')[0]}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
		}
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: string, options?: RequestInit) => {
				requests.push({ url, options });
				if (url.includes('/init')) {
					if (failedInitAttempts-- > 0)
						return Response.json({ error: 'temporary' }, { status: 503 });
					const id = new URL(url).searchParams.get('c15tVisitId') ?? responseId;
					return Response.json(initData(mismatchedEcho ? responseId : id));
				}
				return Response.json({ success: true });
			})
		);
	});
	afterEach(() => {
		clearConsentRuntimeCache();
		vi.unstubAllGlobals();
	});

	it('adds no requests and links a save to the matching init, including cached remounts', async () => {
		const options = { mode: 'hosted' as const, backendURL };
		const runtime = getOrCreateConsentRuntime(options);
		await waitForInit(runtime);
		const init = inits()[0];
		const visitId = new URL(init?.url ?? '').searchParams.get('c15tVisitId');
		expect(visitId).toMatch(/^[0-9a-f-]{36}$/);
		expect(new URL(init?.url ?? '').searchParams.get('c15tVisitId')).toBe(
			visitId
		);
		expect(init?.options?.cache).toBe('no-store');
		expect(new URL(init?.url ?? '').searchParams.get('c15tVisitSource')).toBe(
			'browser'
		);
		expect(new Headers(init?.options?.headers).has('x-c15t-visit-id')).toBe(
			false
		);
		expect(new Headers(init?.options?.headers).has('x-c15t-visit-source')).toBe(
			false
		);
		expect(getOrCreateConsentRuntime(options).consentStore).toBe(
			runtime.consentStore
		);
		await runtime.consentStore.getState().saveConsents('all');
		expect(body(saves()[0])).toMatchObject({
			metadata: { c15tVisitId: visitId },
		});
		window.dispatchEvent(
			new PageTransitionEvent('pagehide', { persisted: false })
		);
		expect(requests).toHaveLength(2);
	});

	it('reuses the same ID for retries but rotates it for a new actual init request', async () => {
		failedInitAttempts = 1;
		const runtime = getOrCreateConsentRuntime({ mode: 'hosted', backendURL });
		await waitForInit(runtime);
		expect(inits()).toHaveLength(2);
		const firstId = new URL(inits()[0]?.url ?? '').searchParams.get(
			'c15tVisitId'
		);
		expect(new URL(inits()[1]?.url ?? '').searchParams.get('c15tVisitId')).toBe(
			firstId
		);
		await runtime.consentStore.getState().initConsentManager();
		const nextId = new URL(inits()[2]?.url ?? '').searchParams.get(
			'c15tVisitId'
		);
		expect(nextId).not.toBe(firstId);
		await runtime.consentStore.getState().saveConsents('all');
		expect(body(saves()[0]).metadata.c15tVisitId).toBe(nextId);
	});

	it.each([
		'disabled',
		'mismatched',
	] as const)('omits correlation when the acknowledgement is %s', async (kind) => {
		trackingEnabled = kind !== 'disabled';
		mismatchedEcho = kind === 'mismatched';
		const runtime = getOrCreateConsentRuntime({ mode: 'hosted', backendURL });
		await waitForInit(runtime);
		await runtime.consentStore.getState().saveConsents('all');
		expect(body(saves()[0])).not.toHaveProperty('metadata');
		expect(requests).toHaveLength(2);
	});

	it('does not adopt shared SSR identifiers or issue a fallback browser request', async () => {
		const runtime = getOrCreateConsentRuntime({
			mode: 'hosted',
			backendURL,
			ssrData: Promise.resolve({ init: initData() }),
		});
		await waitForInit(runtime);
		await runtime.consentStore.getState().saveConsents('all');
		expect(inits()).toHaveLength(0);
		expect(body(saves()[0])).not.toHaveProperty('metadata');
		expect(requests).toHaveLength(1);
	});

	it('adopts only a matching explicitly request-scoped SSR identifier', async () => {
		const runtime = getOrCreateConsentRuntime({
			mode: 'hosted',
			backendURL,
			ssrData: Promise.resolve({
				init: initData(),
				metadata: { visitTracking: { source: 'ssr', visitId: responseId } },
			}),
		});
		await waitForInit(runtime);
		await runtime.consentStore.getState().saveConsents('all');
		expect(inits()).toHaveLength(0);
		expect(body(saves()[0]).metadata.c15tVisitId).toBe(responseId);
	});

	it.each([
		'module',
		'inline',
	] as const)('reuses %s browser prefetch and its ID without another init request', async (kind) => {
		if (kind === 'module') await primePrefetchedInitialData({ backendURL });
		else new Function(buildPrefetchScript({ backendURL }))();
		const runtime = getOrCreateConsentRuntime({ mode: 'hosted', backendURL });
		await waitForInit(runtime);
		await runtime.consentStore.getState().saveConsents('all');
		expect(inits()).toHaveLength(1);
		const id = new URL(inits()[0]?.url ?? '').searchParams.get('c15tVisitId');
		expect(body(saves()[0]).metadata.c15tVisitId).toBe(id);
		expect(requests).toHaveLength(2);
	});

	it('links saves from init callbacks before subscribers can submit a choice', async () => {
		let runtime: ConsentRuntimeResult;
		runtime = getOrCreateConsentRuntime({
			mode: 'hosted',
			backendURL,
			callbacks: {
				onBannerFetched: () => {
					void runtime.consentStore.getState().saveConsents('all');
				},
			},
		});
		await vi.waitFor(() => expect(saves()).toHaveLength(1));
		expect(body(saves()[0]).metadata.c15tVisitId).toBe(
			new URL(inits()[0]?.url ?? '').searchParams.get('c15tVisitId')
		);
	});
});
