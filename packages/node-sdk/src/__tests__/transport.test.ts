/**
 * Transport behaviour against an injected `fetch`: timeouts, retries,
 * aborts, error classification, headers and URL building.
 */

import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import { POLICY_CONTRACT_HEADER } from '@c15t/schema/types';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createC15tClient } from '../index';
import type { C15tClient, C15tClientOptions, C15tRequestEvent } from '../index';
import { errorOf, successOf } from './result-helpers';

type FetchInput = Parameters<typeof fetch>[0];
type FetchMock = ReturnType<typeof vi.fn<typeof fetch>>;

const BASE_URL = 'https://api.test/api/c15t';

const STATUS_BODY = {
	client: {
		acceptLanguage: 'en',
		ip: null,
		region: { countryCode: null, regionCode: null },
		userAgent: null,
	},
	timestamp: '2026-01-01T00:00:00.000Z',
	version: '3.0.0',
};

const json = (
	body: unknown,
	{
		status = 200,
		headers = {},
	}: { status?: number; headers?: Record<string, string> } = {}
): Response =>
	new Response(JSON.stringify(body), {
		headers: { 'content-type': 'application/json', ...headers },
		status,
	});

const apiError = (
	status: number,
	cause: { code: string; reason?: string },
	headers: Record<string, string> = {}
): Response =>
	json({ cause, message: `Backend says ${cause.code}` }, { headers, status });

const okStatus = (): Response => json(STATUS_BODY);

const createClient = (
	fetchImpl: typeof fetch,
	options: Partial<C15tClientOptions> = {}
): C15tClient =>
	createC15tClient({
		apiKey: 'sk_test',
		baseUrl: BASE_URL,
		fetch: fetchImpl,
		retry: { initialDelayMs: 0 },
		...options,
	});

/** The request the client handed to `fetch` on a given attempt. */
const sentRequest = (fetchMock: FetchMock, attempt = 0): Request => {
	const call = fetchMock.mock.calls[attempt];
	if (call === undefined) {
		throw new Error(`fetch was not called ${attempt + 1} time(s)`);
	}
	const [input, init] = call;
	return new Request(input, init);
};

/** Never answers; rejects with the signal's reason when it aborts. */
const hangUntilAborted = (
	_input: FetchInput,
	init?: RequestInit
): Promise<Response> =>
	new Promise((_resolve, reject) => {
		const signal = init?.signal;
		signal?.addEventListener('abort', () => reject(signal.reason), {
			once: true,
		});
	});

/**
 * Sends headers and part of the body, then stalls. Like a spec-compliant
 * fetch, the body stream errors when the request signal aborts.
 */
const stallBody = (
	_input: FetchInput,
	init?: RequestInit
): Promise<Response> => {
	const signal = init?.signal;
	const body = new ReadableStream<Uint8Array>({
		start(controller) {
			controller.enqueue(new TextEncoder().encode('{"timestamp":'));
			signal?.addEventListener('abort', () => controller.error(signal.reason), {
				once: true,
			});
		},
	});
	return Promise.resolve(
		new Response(body, { headers: { 'content-type': 'application/json' } })
	);
};

afterEach(() => {
	vi.restoreAllMocks();
});

describe('timeouts', () => {
	it('a body that stalls past timeoutMs is TIMEOUT', async () => {
		const fetchMock = vi.fn<typeof fetch>(stallBody);
		const client = createClient(fetchMock, { retry: false, timeoutMs: 30 });

		const error = errorOf(await client.status());

		expect(error.code).toBe('TIMEOUT');
		expect(error.retryable).toBe(true);
		expect(error.message).toContain('30ms');
	});

	it('a response that never starts is TIMEOUT, and the per-call timeout wins', async () => {
		const fetchMock = vi.fn<typeof fetch>(hangUntilAborted);
		const client = createClient(fetchMock, { retry: false });

		const startedAt = Date.now();
		const error = errorOf(await client.status({ timeoutMs: 20 }));

		expect(error.code).toBe('TIMEOUT');
		expect(Date.now() - startedAt).toBeLessThan(5000);
	});

	it('a timed-out idempotent call is retried', async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockImplementationOnce(hangUntilAborted)
			.mockResolvedValueOnce(okStatus());
		const client = createClient(fetchMock, { timeoutMs: 20 });

		const result = await client.status();

		expect(result.ok).toBe(true);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('covers the body read with the platform fetch too', async () => {
		const server = createServer((_request, response) => {
			response.writeHead(200, { 'content-type': 'application/json' });
			response.write('{"timestamp":');
		});
		await new Promise<void>((resolve) => {
			server.listen(0, '127.0.0.1', resolve);
		});
		try {
			const { port } = server.address() as AddressInfo;
			const client = createC15tClient({
				apiKey: 'sk_test',
				baseUrl: `http://127.0.0.1:${port}/api/c15t`,
				retry: false,
				timeoutMs: 50,
			});

			const error = errorOf(await client.status());

			expect(error.code).toBe('TIMEOUT');
		} finally {
			server.closeAllConnections();
			server.close();
		}
	});
});

describe('retries', () => {
	it.each([408, 429, 500, 502, 503, 504])(
		'retries a %i and returns the later success',
		async (status) => {
			const fetchMock = vi
				.fn<typeof fetch>()
				.mockResolvedValueOnce(new Response('busy', { status }))
				.mockResolvedValueOnce(okStatus());
			const client = createClient(fetchMock);

			const result = await client.status();

			expect(result.ok).toBe(true);
			expect(fetchMock).toHaveBeenCalledTimes(2);
		}
	);

	it.each([400, 401, 404, 409, 422])('does not retry a %i', async (status) => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValue(new Response('no', { status }));
		const client = createClient(fetchMock);

		const error = errorOf(await client.status());

		expect(error.retryable).toBe(false);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('sends the same x-request-id on every attempt', async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(new Response('', { status: 503 }))
			.mockResolvedValueOnce(new Response('', { status: 503 }))
			.mockResolvedValueOnce(okStatus());
		const client = createClient(fetchMock);

		const result = await client.status();

		const ids = [0, 1, 2].map((attempt) =>
			sentRequest(fetchMock, attempt).headers.get('x-request-id')
		);
		expect(result.ok && result.requestId).toBe(ids[0]);
		expect(ids[0]).toMatch(/^[\da-f-]{36}$/u);
		expect(new Set(ids).size).toBe(1);
	});

	it('sends a caller-provided request id and reports it', async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValue(apiError(404, { code: 'NOT_FOUND' }));
		const client = createClient(fetchMock);

		const error = errorOf(
			await client.subjects.get('sub_abc', undefined, { requestId: 'req_42' })
		);

		expect(sentRequest(fetchMock).headers.get('x-request-id')).toBe('req_42');
		expect(error.requestId).toBe('req_42');
	});

	it('stops after maxRetries and returns the last failure', async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockImplementation(() =>
				Promise.resolve(apiError(503, { code: 'SERVICE_UNAVAILABLE' }))
			);
		const client = createClient(fetchMock, {
			retry: { initialDelayMs: 0, maxRetries: 1 },
		});

		const error = errorOf(await client.status());

		expect(error.code).toBe('SERVICE_UNAVAILABLE');
		expect(error.retryable).toBe(true);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('does not retry when the client sets retry: false', async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValue(new Response('', { status: 503 }));
		const client = createClient(fetchMock, { retry: false });

		const error = errorOf(await client.status());

		expect(error.retryable).toBe(true);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('does not retry when the call sets retry: false', async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValue(new Response('', { status: 503 }));
		const client = createClient(fetchMock);

		await client.status({ retry: false });

		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('a partial per-call retry keeps the client fields it leaves out', async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockImplementation(() =>
				Promise.resolve(new Response('', { status: 503 }))
			);
		const client = createClient(fetchMock, {
			retry: { initialDelayMs: 0, maxRetries: 0 },
		});

		await client.status({ retry: { maxDelayMs: 10 } });

		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('a per-call retry re-enables retries on a client that disabled them', async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(new Response('', { status: 503 }))
			.mockResolvedValueOnce(okStatus());
		const client = createClient(fetchMock, { retry: false });

		const result = await client.status({
			retry: { initialDelayMs: 0, maxRetries: 1 },
		});

		expect(result.ok).toBe(true);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('honours Retry-After: 0 over a long backoff', async () => {
		// Pin the jitter near its bound, so only Retry-After keeps this fast.
		vi.spyOn(Math, 'random').mockReturnValue(0.999);
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(
				new Response('', { headers: { 'retry-after': '0' }, status: 429 })
			)
			.mockResolvedValueOnce(okStatus());
		const client = createClient(fetchMock, {
			retry: { initialDelayMs: 60_000, maxDelayMs: 60_000 },
		});

		const startedAt = Date.now();
		const result = await client.status();

		expect(result.ok).toBe(true);
		expect(Date.now() - startedAt).toBeLessThan(5000);
	});

	it('honours a Retry-After HTTP date in the past', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.999);
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(
				new Response('', {
					headers: {
						'retry-after': new Date(Date.now() - 60_000).toUTCString(),
					},
					status: 503,
				})
			)
			.mockResolvedValueOnce(okStatus());
		const client = createClient(fetchMock, {
			retry: { initialDelayMs: 60_000, maxDelayMs: 60_000 },
		});

		const result = await client.status();

		expect(result.ok).toBe(true);
	});

	it('falls back to backoff when Retry-After is unreadable', async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(
				new Response('', { headers: { 'retry-after': 'soon' }, status: 503 })
			)
			.mockResolvedValueOnce(okStatus());
		const client = createClient(fetchMock);

		const result = await client.status();

		expect(result.ok).toBe(true);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('stops retrying when Retry-After is longer than maxDelayMs', async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValue(
				apiError(503, { code: 'SERVICE_UNAVAILABLE' }, { 'retry-after': '10' })
			);
		const client = createClient(fetchMock, {
			retry: { initialDelayMs: 0, maxDelayMs: 5000 },
		});

		const startedAt = Date.now();
		const error = errorOf(await client.status());

		expect(error.code).toBe('SERVICE_UNAVAILABLE');
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(Date.now() - startedAt).toBeLessThan(5000);
	});

	it('retries a network error, then reports NETWORK_ERROR as retryable', async () => {
		const failure = new TypeError('fetch failed');
		const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(failure);
		const client = createClient(fetchMock);

		const error = errorOf(await client.status());

		expect(error.code).toBe('NETWORK_ERROR');
		expect(error.retryable).toBe(true);
		expect(error.cause).toBe(failure);
		expect(error.message).toContain('fetch failed');
		expect(error.status).toBeUndefined();
		expect(fetchMock).toHaveBeenCalledTimes(3);
	});

	it('every endpoint call retries, including writes the backend makes idempotent', async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(new Response('', { status: 502 }))
			.mockResolvedValueOnce(
				json({
					consentId: 'cns_1',
					domain: 'example.com',
					domainId: 'dom_1',
					givenAt: '2026-01-01T00:00:00.000Z',
					ok: true,
					subjectId: 'sub_abc',
					type: 'cookie_banner',
				})
			);
		const client = createClient(fetchMock);

		const result = await client.subjects.create({
			domain: 'example.com',
			givenAt: 1_767_225_600_000,
			preferences: { necessary: true },
			subjectId: 'sub_abc',
			type: 'cookie_banner',
		});

		expect(result.ok).toBe(true);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});
});

describe('aborts', () => {
	it('a signal aborted before the call sends nothing', async () => {
		const fetchMock = vi.fn<typeof fetch>();
		const client = createClient(fetchMock);
		const reason = new Error('shutting down');

		const error = errorOf(
			await client.status({ signal: AbortSignal.abort(reason) })
		);

		expect(error.code).toBe('ABORTED');
		expect(error.cause).toBe(reason);
		expect(error.requestId).toEqual(expect.any(String));
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('aborting mid-request is ABORTED and not retried', async () => {
		const fetchMock = vi.fn<typeof fetch>(hangUntilAborted);
		const client = createClient(fetchMock);
		const controller = new AbortController();

		const pending = client.status({ signal: controller.signal });
		setTimeout(() => controller.abort(), 10);
		const error = errorOf(await pending);

		expect(error.code).toBe('ABORTED');
		expect(error.retryable).toBe(false);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('aborting while the body is read is ABORTED', async () => {
		const fetchMock = vi.fn<typeof fetch>(stallBody);
		const client = createClient(fetchMock);
		const controller = new AbortController();

		const pending = client.status({ signal: controller.signal });
		setTimeout(() => controller.abort(), 10);
		const error = errorOf(await pending);

		expect(error.code).toBe('ABORTED');
	});

	it('aborting during the backoff before a retry is ABORTED', async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValue(
				new Response('', { headers: { 'retry-after': '1' }, status: 503 })
			);
		const client = createClient(fetchMock);
		const controller = new AbortController();
		const reason = new Error('user left');

		const startedAt = Date.now();
		const pending = client.status({ signal: controller.signal });
		setTimeout(() => controller.abort(reason), 20);
		const error = errorOf(await pending);

		expect(error.code).toBe('ABORTED');
		expect(error.cause).toBe(reason);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(Date.now() - startedAt).toBeLessThan(900);
	});

	it('aborting just before the backoff starts is ABORTED without waiting', async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValue(
				new Response('', { headers: { 'retry-after': '1' }, status: 503 })
			);
		const controller = new AbortController();
		const client = createClient(fetchMock, {
			onEvent: (event) => {
				if (event.type === 'retry') {
					controller.abort();
				}
			},
		});

		const startedAt = Date.now();
		const error = errorOf(await client.status({ signal: controller.signal }));

		expect(error.code).toBe('ABORTED');
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(Date.now() - startedAt).toBeLessThan(900);
	});
});

describe('response classification', () => {
	it('parses a declared code with its STALE_POLICY reason', async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValue(
				apiError(422, { code: 'STALE_POLICY', reason: 'policy-changed' })
			);
		const client = createClient(fetchMock);

		const error = errorOf(
			await client.subjects.create({
				domain: 'example.com',
				givenAt: 1_767_225_600_000,
				preferences: { necessary: true },
				subjectId: 'sub_abc',
				type: 'cookie_banner',
			})
		);

		expect(error.code).toBe('STALE_POLICY');
		expect(error.reason).toBe('policy-changed');
		expect(error.status).toBe(422);
		expect(error.message).toBe('Backend says STALE_POLICY');
		expect(error.serverCode).toBeUndefined();
		expect(error.retryable).toBe(false);
	});

	it('drops a reason sent with any other code', async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValue(apiError(404, { code: 'NOT_FOUND', reason: 'gone' }));
		const client = createClient(fetchMock);

		const error = errorOf(await client.subjects.get('sub_abc'));

		expect(error.code).toBe('NOT_FOUND');
		expect(error.reason).toBeUndefined();
	});

	it('reports a code the endpoint does not declare as UNEXPECTED_RESPONSE with serverCode', async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValue(apiError(409, { code: 'CONFLICT' }));
		const client = createClient(fetchMock);

		const error = errorOf(await client.subjects.get('sub_abc'));

		expect(error.code).toBe('UNEXPECTED_RESPONSE');
		expect(error.serverCode).toBe('CONFLICT');
		expect(error.status).toBe(409);
		expect(error.message).toBe('Backend says CONFLICT');
	});

	it('names an undocumented code in the message when the body has none', async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValue(json({ cause: { code: 'TEAPOT' } }, { status: 418 }));
		const client = createClient(fetchMock);

		const error = errorOf(await client.subjects.get('sub_abc'));

		expect(error.code).toBe('UNEXPECTED_RESPONSE');
		expect(error.serverCode).toBe('TEAPOT');
		expect(error.message).toContain('TEAPOT');
	});

	it('a plain-text 500 is UNEXPECTED_RESPONSE', async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValue(
				new Response('Internal Server Error', { status: 500 })
			);
		const client = createClient(fetchMock, { retry: false });

		const error = errorOf(await client.subjects.get('sub_abc'));

		expect(error.code).toBe('UNEXPECTED_RESPONSE');
		expect(error.status).toBe(500);
		expect(error.retryable).toBe(true);
		expect(error.serverCode).toBeUndefined();
	});

	it('a JSON error body without an object is UNEXPECTED_RESPONSE', async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValue(json('nope', { status: 400 }));
		const client = createClient(fetchMock);

		const error = errorOf(await client.subjects.get('sub_abc'));

		expect(error.code).toBe('UNEXPECTED_RESPONSE');
		expect(error.serverCode).toBeUndefined();
	});

	it('a non-JSON 200 is UNEXPECTED_RESPONSE and not retried', async () => {
		const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
			new Response('<html>proxy</html>', {
				headers: { 'content-type': 'text/html' },
			})
		);
		const client = createClient(fetchMock);

		const error = errorOf(await client.status());

		expect(error.code).toBe('UNEXPECTED_RESPONSE');
		expect(error.status).toBe(200);
		expect(error.message).toContain('not JSON');
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('a 200 without the documented shape is UNEXPECTED_RESPONSE', async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValue(json({ ...STATUS_BODY, timestamp: 'yesterday' }));
		const client = createClient(fetchMock);

		const error = errorOf(await client.status());

		expect(error.code).toBe('UNEXPECTED_RESPONSE');
		expect(error.message).toContain('timestamp');
	});

	it('an empty 204 is UNEXPECTED_RESPONSE', async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValue(new Response(null, { status: 204 }));
		const client = createClient(fetchMock);

		const error = errorOf(await client.subjects.get('sub_abc'));

		expect(error.code).toBe('UNEXPECTED_RESPONSE');
	});

	it('returns status, headers and request id with the data', async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValue(json(STATUS_BODY, { headers: { 'x-trace': 'abc' } }));
		const client = createClient(fetchMock);

		const result = successOf(await client.status());

		expect(result.status).toBe(200);
		expect(result.headers.get('x-trace')).toBe('abc');
		expect(result.requestId).toBe(
			sentRequest(fetchMock).headers.get('x-request-id')
		);
		expect(result.data.timestamp).toEqual(new Date(STATUS_BODY.timestamp));
	});
});

describe('headers', () => {
	it('owned headers beat caller headers', async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValue(apiError(401, { code: 'UNAUTHORIZED' }));
		const hostile = {
			Accept: 'text/html',
			Authorization: 'Bearer stolen',
			'Content-Type': 'text/plain',
			'X-C15T-Version': '0.0.0',
			'X-Request-Id': 'spoofed',
			[POLICY_CONTRACT_HEADER.toUpperCase()]: '0',
		};
		const client = createClient(fetchMock, { headers: hostile });

		const error = errorOf(
			await client.legalDocuments.publish(
				'privacy_policy',
				{
					effectiveDate: '2026-01-01T00:00:00Z',
					hash: 'sha256:x',
					version: '1',
				},
				{ headers: hostile }
			)
		);

		const { headers } = sentRequest(fetchMock);
		expect(headers.get('authorization')).toBe('Bearer sk_test');
		expect(headers.get('accept')).toBe('application/json');
		expect(headers.get('content-type')).toBe('application/json');
		expect(headers.get('x-c15t-version')).not.toBe('0.0.0');
		expect(headers.get('x-request-id')).toBe(error.requestId);
		expect(headers.get(POLICY_CONTRACT_HEADER)).not.toBe('0');
	});

	it('sends no content-type or authorization when there is no body or key', async () => {
		const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(okStatus());
		const client = createC15tClient({ baseUrl: BASE_URL, fetch: fetchMock });

		await client.status();

		const { headers } = sentRequest(fetchMock);
		expect(headers.has('content-type')).toBe(false);
		expect(headers.has('authorization')).toBe(false);
	});

	it('merges client and call headers, the call winning regardless of case', async () => {
		const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(okStatus());
		const client = createClient(fetchMock, {
			headers: { 'X-Client': 'client', 'X-Tenant': 'from-client' },
		});

		await client.status({
			headers: { 'X-Call': 'call', 'x-tenant': 'from-call' },
		});

		const { headers } = sentRequest(fetchMock);
		expect(headers.get('x-client')).toBe('client');
		expect(headers.get('x-call')).toBe('call');
		expect(headers.get('x-tenant')).toBe('from-call');
	});

	it('init sends the visitor context as headers over caller headers', async () => {
		const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(json({}));
		const client = createClient(fetchMock);

		await client.init(
			{ country: 'DE', gpc: true, language: 'de', region: 'BE' },
			{ headers: { 'Accept-Language': 'fr', 'X-C15T-Country': 'FR' } }
		);

		const { headers } = sentRequest(fetchMock);
		expect(headers.get('accept-language')).toBe('de');
		expect(headers.get('x-c15t-country')).toBe('DE');
		expect(headers.get('x-c15t-region')).toBe('BE');
		expect(headers.get('x-c15t-gpc')).toBe('1');
	});
});

describe('requests', () => {
	it('encodes path params and query values', async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValue(apiError(404, { code: 'NOT_FOUND' }));
		const client = createClient(fetchMock);

		await client.subjects.get('a/b?c#d', {
			types: ['cookie_banner', 'privacy_policy'],
		});

		const url = new URL(sentRequest(fetchMock).url);
		expect(url.pathname).toBe('/api/c15t/subjects/a%2Fb%3Fc%23d');
		expect(url.searchParams.get('type')).toBe('cookie_banner,privacy_policy');
	});

	it('encodes a query value with reserved characters', async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValue(json({ results: { cookie_banner: {} } }));
		const client = createClient(fetchMock);

		await client.consents.check({
			externalId: 'a&b=c d',
			types: ['cookie_banner'],
		});

		const url = new URL(sentRequest(fetchMock).url);
		expect(url.pathname).toBe('/api/c15t/consents/check');
		expect(url.searchParams.get('externalId')).toBe('a&b=c d');
		expect([...url.searchParams.keys()]).toEqual(['externalId', 'type']);
	});

	it('sends summary dates as ISO strings and leaves out absent filters', async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValue(json({ arms: [], experimentId: 'exp/1' }));
		const client = createClient(fetchMock);

		await client.experiments.summary('exp/1', {
			from: new Date('2026-09-01T00:00:00Z'),
		});

		const url = new URL(sentRequest(fetchMock).url);
		expect(url.pathname).toBe('/api/c15t/experiments/exp%2F1/summary');
		expect(url.searchParams.get('from')).toBe('2026-09-01T00:00:00.000Z');
		expect(url.searchParams.has('to')).toBe(false);
	});

	// `encodeURIComponent` leaves `.` and `..` alone and URL resolution then
	// removes them, so the id would change the route. Percent-encoding them
	// would not help (`%2E%2E` is also a dot segment), so validation refuses
	// them.
	it('keeps a dot-segment id inside its own path segment', async () => {
		const fetchMock = vi.fn<typeof fetch>(() =>
			Promise.resolve(apiError(404, { code: 'NOT_FOUND' }))
		);
		const client = createClient(fetchMock);

		const results = [
			await client.subjects.get('..'),
			await client.subjects.get('.'),
			await client.experiments.summary('..'),
		];

		// Either refused before sending, or sent to a URL that stays under the
		// route the method names. Unchecked, `subjects.get('..')` would request
		// `/api/c15t/` and `experiments.summary('..')` `/api/c15t/summary`.
		for (const [index, call] of fetchMock.mock.calls.entries()) {
			const { pathname } = new URL(String(call[0]));
			expect(pathname, `request ${index}`).toMatch(
				/^\/api\/c15t\/(?:subjects|experiments)\/[^/]+(?:\/summary)?$/u
			);
		}
		for (const result of results) {
			expect(result.ok || result.error.code === 'INVALID_INPUT').toBe(true);
		}
	});

	it('sends a JSON body with the method the endpoint names', async () => {
		const fetchMock = vi.fn<typeof fetch>(() =>
			Promise.resolve(apiError(401, { code: 'UNAUTHORIZED' }))
		);
		const client = createClient(fetchMock);

		await client.legalDocuments.publish('privacy_policy', {
			effectiveDate: new Date('2026-01-01T00:00:00Z'),
			hash: 'sha256:x',
			version: '1',
		});
		await client.subjects.identify('sub_abc', { externalId: 'user_1' });
		await client.subjects.create({
			domain: 'example.com',
			givenAt: new Date(1_767_225_600_000),
			preferences: { necessary: true },
			subjectId: 'sub_abc',
			type: 'cookie_banner',
		});

		const publish = sentRequest(fetchMock, 0);
		expect(publish.method).toBe('PUT');
		expect(new URL(publish.url).pathname).toBe(
			'/api/c15t/legal-documents/privacy_policy/current'
		);
		expect(await publish.json()).toEqual({
			effectiveDate: '2026-01-01T00:00:00.000Z',
			hash: 'sha256:x',
			version: '1',
		});
		const identify = sentRequest(fetchMock, 1);
		expect(identify.method).toBe('PATCH');
		expect(await identify.json()).toEqual({ externalId: 'user_1' });
		const create = sentRequest(fetchMock, 2);
		expect(create.method).toBe('POST');
		expect(await create.json()).toMatchObject({ givenAt: 1_767_225_600_000 });
	});

	// Native fetch on Cloudflare Workers and in browsers throws "Illegal
	// invocation" when called with a foreign receiver, which the client would
	// report as NETWORK_ERROR on every call.
	it('calls fetch without a receiver, as Workers and browsers require', async () => {
		const receivers: unknown[] = [];
		const strictFetch = function strictFetch(this: unknown) {
			receivers.push(this);
			return Promise.resolve(okStatus());
		};
		const client = createClient(strictFetch as typeof fetch);

		await client.status();

		// Compared by identity: printing globalThis in a failure message
		// trips Vitest's worker RPC proxy.
		expect(receivers[0] === undefined || receivers[0] === globalThis).toBe(
			true
		);
	});
});

describe('events', () => {
	it('reports request, response and retry events', async () => {
		const events: C15tRequestEvent[] = [];
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(new Response('', { status: 503 }))
			.mockResolvedValueOnce(okStatus());
		const client = createClient(fetchMock, {
			onEvent: (event) => events.push(event),
		});

		const result = await client.status();

		const requestId = result.ok ? result.requestId : '';
		const base = { method: 'GET', path: '/status', requestId };
		expect(events).toEqual([
			{ ...base, attempt: 0, type: 'request' },
			{
				...base,
				attempt: 0,
				durationMs: expect.any(Number),
				status: 503,
				type: 'response',
			},
			{
				...base,
				attempt: 0,
				delayMs: expect.any(Number),
				error: expect.objectContaining({ status: 503 }),
				type: 'retry',
			},
			{ ...base, attempt: 1, type: 'request' },
			{
				...base,
				attempt: 1,
				durationMs: expect.any(Number),
				status: 200,
				type: 'response',
			},
		]);
	});

	it('a throwing onEvent does not change the result', async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(new Response('', { status: 503 }))
			.mockResolvedValueOnce(okStatus());
		const onEvent = vi.fn(() => {
			throw new Error('observer bug');
		});
		const client = createClient(fetchMock, { onEvent });

		const result = await client.status();

		expect(result.ok).toBe(true);
		expect(onEvent).toHaveBeenCalledTimes(5);
	});
});

describe('the client never rejects', () => {
	it('when fetch throws synchronously', async () => {
		const fetchMock = vi.fn<typeof fetch>(() => {
			throw new Error('sync');
		});
		const client = createClient(fetchMock, { retry: false });

		await expect(client.status()).resolves.toMatchObject({
			error: { code: 'NETWORK_ERROR' },
			ok: false,
		});
	});

	it('when fetch resolves to something that is not a Response', async () => {
		const fetchMock = vi.fn<typeof fetch>(() =>
			Promise.resolve({} as Response)
		);
		const client = createClient(fetchMock, { retry: false });

		await expect(client.status()).resolves.toMatchObject({ ok: false });
	});

	it('when reading input throws', async () => {
		const fetchMock = vi.fn<typeof fetch>();
		const client = createClient(fetchMock);
		const request = {
			get types(): never {
				throw new Error('getter exploded');
			},
		};

		const error = errorOf(await client.subjects.get('sub_abc', request));

		expect(error.code).toBe('INVALID_INPUT');
		expect(error.issues).toEqual([{ message: 'getter exploded' }]);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('when the input is not an object', async () => {
		const fetchMock = vi.fn<typeof fetch>();
		const client = createClient(fetchMock);
		const calls = [
			client.consents.check(null as never),
			client.subjects.create('nope' as never),
			client.subjects.list(42 as never),
			client.subjects.identify('sub_abc', null as never),
			client.subjects.get('sub_abc', 'nope' as never),
			client.experiments.summary('exp_1', 'nope' as never),
			client.legalDocuments.publish('privacy_policy', null as never),
			client.init('nope' as never),
			client.manifest(7 as never),
		];

		const results = await Promise.all(calls);

		for (const result of results) {
			expect(result.ok || result.error.code).toBe('INVALID_INPUT');
		}
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('when init or manifest options have the wrong types', async () => {
		const fetchMock = vi.fn<typeof fetch>();
		const client = createClient(fetchMock);

		const init = errorOf(
			await client.init({ country: '', gpc: 'yes' as never, language: '' })
		);
		const manifest = errorOf(await client.manifest({ ifNoneMatch: '' }));

		expect(init.issues?.map((issue) => issue.path)).toEqual([
			['language'],
			['country'],
			['gpc'],
		]);
		expect(manifest.issues?.map((issue) => issue.path)).toEqual([
			['ifNoneMatch'],
		]);
	});
});

describe('review regressions', () => {
	it.each([
		{},
		{ cookie_banner: { hasConsent: false, isLatestPolicy: true } },
		{
			cookie_banner: null,
			privacy_policy: { hasConsent: true, isLatestPolicy: true },
		},
		{
			cookie_banner: { hasConsent: 'false', isLatestPolicy: true },
			privacy_policy: { hasConsent: false, isLatestPolicy: true },
		},
		{
			cookie_banner: { hasConsent: false, isLatestPolicy: 'true' },
			privacy_policy: { hasConsent: false, isLatestPolicy: true },
		},
		{
			cookie_banner: { hasConsent: false },
			privacy_policy: { hasConsent: false, isLatestPolicy: true },
		},
		{
			cookie_banner: { hasConsent: false, isLatestPolicy: true },
			extra: {},
			privacy_policy: { hasConsent: false, isLatestPolicy: true },
		},
	])('rejects incomplete or malformed consent results: %o', async (results) => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValue(json({ results }));
		const client = createClient(fetchMock);
		await expect(
			client.consents.check({
				externalId: 'user_1',
				types: ['cookie_banner', 'privacy_policy'],
			})
		).resolves.toMatchObject({
			error: { code: 'UNEXPECTED_RESPONSE', status: 200 },
			ok: false,
		});
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('preserves false consent values and suffixed policy types', async () => {
		const results = {
			cookie_banner: { hasConsent: false, isLatestPolicy: true },
			terms_and_conditions_b2b: { hasConsent: true, isLatestPolicy: false },
		};
		const client = createClient(
			vi.fn<typeof fetch>().mockResolvedValue(json({ results }))
		);
		await expect(
			client.consents.check({
				externalId: 'user_1',
				types: ['cookie_banner', 'terms_and_conditions_b2b'],
			})
		).resolves.toMatchObject({ data: { results }, ok: true });
	});

	it.each(['bigint', 'cycle', 'toJSON'])(
		'returns INVALID_INPUT when metadata cannot serialize: %s',
		async (kind) => {
			const metadata: Record<string, unknown> = {};
			if (kind === 'bigint') {
				metadata.count = 1n;
			}
			if (kind === 'cycle') {
				metadata.self = metadata;
			}
			if (kind === 'toJSON') {
				metadata.toJSON = () => {
					throw new Error('cannot serialize');
				};
			}
			const fetchMock = vi.fn<typeof fetch>();
			const client = createClient(fetchMock);
			await expect(
				client.subjects.create({
					domain: 'example.com',
					givenAt: Date.now(),
					metadata,
					preferences: { necessary: true },
					subjectId: 'sub_abc',
					type: 'cookie_banner',
				})
			).resolves.toMatchObject({
				error: { code: 'INVALID_INPUT', issues: expect.any(Array) },
				ok: false,
			});
			expect(fetchMock).not.toHaveBeenCalled();
		}
	);

	it('returns a result when timeout signal creation throws', async () => {
		vi.spyOn(AbortSignal, 'timeout').mockImplementation(() => {
			throw new RangeError('out of range');
		});
		const fetchMock = vi.fn<typeof fetch>();
		const client = createClient(fetchMock);
		await expect(client.status()).resolves.toMatchObject({
			error: { code: 'INVALID_INPUT' },
			ok: false,
		});
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it.each([
		'policy-changed',
		'decision-mismatch',
		'incomplete-inputs',
		'future-reason',
		undefined,
	])('narrows the stale-policy reason from the wire: %s', async (reason) => {
		const client = createClient(
			vi
				.fn<typeof fetch>()
				.mockResolvedValue(apiError(422, { code: 'STALE_POLICY', reason }))
		);
		const error = errorOf(
			await client.subjects.create({
				domain: 'example.com',
				givenAt: Date.now(),
				preferences: { necessary: true },
				subjectId: 'sub_abc',
				type: 'cookie_banner',
			})
		);
		expect(error.code).toBe('STALE_POLICY');
		expect(error.reason).toBe(reason === 'future-reason' ? undefined : reason);
	});
});
