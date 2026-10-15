import type { RequestEvent, RequestHandler } from '@sveltejs/kit';
import { describe, expect, test, vi } from 'vitest';

import { traceConsent } from '../../../../../../internals/doc-snippets/sveltekit/src/lib/server/trace-consent';
import { createConsentRoute } from '../routes';
import { createEvent } from './event';
import { MANIFEST_FIXTURE } from './manifest-fixture';

type Span = RequestEvent['tracing']['current'];

const createSpan = (): Span => ({
	addEvent: vi.fn<Span['addEvent']>().mockReturnThis(),
	addLink: vi.fn<Span['addLink']>().mockReturnThis(),
	addLinks: vi.fn<Span['addLinks']>().mockReturnThis(),
	end: vi.fn<Span['end']>(),
	isRecording: vi.fn<Span['isRecording']>().mockReturnValue(true),
	recordException: vi.fn<Span['recordException']>(),
	setAttribute: vi.fn<Span['setAttribute']>().mockReturnThis(),
	setAttributes: vi.fn<Span['setAttributes']>().mockReturnThis(),
	setStatus: vi.fn<Span['setStatus']>().mockReturnThis(),
	spanContext: vi.fn<Span['spanContext']>().mockReturnValue({
		spanId: '0000000000000001',
		traceFlags: 1,
		traceId: '00000000000000000000000000000001',
	}),
	updateName: vi.fn<Span['updateName']>().mockReturnThis(),
});

const BACKEND = 'https://consent.example.com';

const tracedEvent = (
	path: string,
	input: Parameters<typeof createEvent>[0] = {},
	enabled = true
) => {
	const tracing = {
		current: createSpan(),
		enabled,
		root: createSpan(),
	} satisfies RequestEvent['tracing'];
	const event = Object.assign(
		createEvent({
			...input,
			route: { id: '/api/c15t/[...path]', params: { path } },
			url: `https://shop.example/api/c15t/${path}`,
		}),
		{ tracing }
	);
	return { event, span: tracing.current };
};

const proxyRoute = (fetch: typeof globalThis.fetch) =>
	createConsentRoute({ backendURL: BACKEND, fetch, proxy: true });

describe('SvelteKit consent tracing recipe', () => {
	test.each([
		['GET', 'init'],
		['GET', ''],
		['GET', 'init/'],
		['HEAD', 'init'],
		['HEAD', ''],
		['HEAD', 'init/'],
	])(
		'records %s %s as init without changing the resolved policy or cache headers',
		async (method, path) => {
			const { GET } = createConsentRoute({
				reportSessions: false,
				snapshot: MANIFEST_FIXTURE,
			});
			const input = { headers: { 'x-vercel-ip-country': 'DE' }, method };
			const { event, span } = tracedEvent(path, input);
			const expected = await GET(tracedEvent(path, input).event);
			const response = await traceConsent(GET)(event);

			expect(response.status).toBe(expected.status);
			expect([...response.headers]).toEqual([...expected.headers]);
			expect(await response.json()).toEqual(await expected.json());
			expect(span.setAttribute).toHaveBeenCalledWith('c15t.operation', 'init');
			expect(span.setAttribute).toHaveBeenCalledWith(
				'http.response.status_code',
				200
			);
			expect(span.setStatus).not.toHaveBeenCalled();
			expect(event.tracing.root.setAttribute).not.toHaveBeenCalled();
		}
	);

	test.each([
		['GET', 'manifest'],
		['GET', 'manifest/'],
		['HEAD', 'manifest'],
		['HEAD', 'manifest/'],
	])(
		'records %s %s and preserves the manifest response',
		async (method, path) => {
			const { GET } = createConsentRoute({
				reportSessions: false,
				snapshot: MANIFEST_FIXTURE,
			});
			const { event, span } = tracedEvent(path, { method });
			const response = await traceConsent(GET)(event);

			expect(response.status).toBe(200);
			expect(await response.json()).toEqual(MANIFEST_FIXTURE);
			expect(span.setAttribute).toHaveBeenCalledWith(
				'c15t.operation',
				'manifest'
			);
			expect(span.setAttribute).toHaveBeenCalledWith(
				'http.response.status_code',
				200
			);
			expect(span.setStatus).not.toHaveBeenCalled();
		}
	);

	test.each([201, 400, 503])(
		'records a proxied HTTP %i and preserves its status, headers and stream',
		async (status) => {
			const body = new ReadableStream<Uint8Array>({
				start(controller) {
					controller.enqueue(new TextEncoder().encode('upstream body'));
					controller.close();
				},
			});
			const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
				new Response(body, {
					headers: { 'content-type': 'text/plain', 'x-upstream': 'preserved' },
					status,
				})
			);
			const { POST } = proxyRoute(fetch);
			const { event, span } = tracedEvent('subjects/sub_private', {
				body: '{"private":"body"}',
				headers: { cookie: 'private=secret' },
				method: 'POST',
			});
			const response = await traceConsent(POST)(event);

			expect(response.status).toBe(status);
			expect(response.headers.get('x-upstream')).toBe('preserved');
			expect(response.headers.get('content-type')).toBe('text/plain');
			expect(response.body).toBe(body);
			expect(response.bodyUsed).toBe(false);
			expect(await response.text()).toBe('upstream body');
			expect(span.setAttribute).toHaveBeenCalledTimes(2);
			expect(span.setAttribute).toHaveBeenCalledWith('c15t.operation', 'proxy');
			expect(span.setAttribute).toHaveBeenCalledWith(
				'http.response.status_code',
				status
			);
			expect(span.setAttributes).not.toHaveBeenCalled();
			const expectedStatuses =
				status >= 500
					? [[{ code: 2, message: `Consent request returned HTTP ${status}` }]]
					: [];
			expect(vi.mocked(span.setStatus).mock.calls).toEqual(expectedStatuses);
		}
	);

	test.each([
		{
			error: new TypeError('fetch failed'),
			message: 'Bad gateway',
			status: 502,
		},
		{
			error: new DOMException('timed out', 'TimeoutError'),
			message: 'Upstream timeout',
			status: 504,
		},
	])(
		'records HTTP $status returned after an upstream fetch failure',
		async ({ error, message, status }) => {
			const fetch = vi.fn<typeof globalThis.fetch>().mockRejectedValue(error);
			const { POST } = proxyRoute(fetch);
			const { event, span } = tracedEvent('subjects', {
				body: '{}',
				method: 'POST',
			});
			const response = await traceConsent(POST)(event);

			expect(response.status).toBe(status);
			expect(await response.json()).toEqual({ error: message });
			expect(span.setAttribute).toHaveBeenCalledWith(
				'http.response.status_code',
				status
			);
			expect(span.setStatus).toHaveBeenCalledExactlyOnceWith({
				code: 2,
				message: `Consent request returned HTTP ${status}`,
			});
		}
	);

	test.each(['init', 'subjects'])(
		'keeps %s working without recording when tracing is disabled',
		async (path) => {
			const fetch = vi
				.fn<typeof globalThis.fetch>()
				.mockResolvedValue(Response.json({ saved: true }, { status: 201 }));
			const { GET, POST } = createConsentRoute({
				backendURL: BACKEND,
				fetch,
				proxy: true,
				reportSessions: false,
				snapshot: MANIFEST_FIXTURE,
			});
			const init = path === 'init';
			const { event, span } = tracedEvent(
				path,
				init ? {} : { body: '{}', method: 'POST' },
				false
			);
			const response = await traceConsent(init ? GET : POST)(event);

			expect(response.status).toBe(init ? 200 : 201);
			expect(await response.json()).toMatchObject(
				init ? { policyResolution: { status: 'matched' } } : { saved: true }
			);
			expect(span.setAttribute).not.toHaveBeenCalled();
			expect(span.setStatus).not.toHaveBeenCalled();
		}
	);

	test('leaves thrown errors for SvelteKit to record', async () => {
		const error = new Error('handler failed');
		const handler: RequestHandler = () => {
			throw error;
		};
		const { event, span } = tracedEvent('init');

		await expect(traceConsent(handler)(event)).rejects.toBe(error);
		expect(span.setAttribute).not.toHaveBeenCalledWith(
			'http.response.status_code',
			expect.anything()
		);
		expect(span.setStatus).not.toHaveBeenCalled();
		expect(span.recordException).not.toHaveBeenCalled();
	});
});
