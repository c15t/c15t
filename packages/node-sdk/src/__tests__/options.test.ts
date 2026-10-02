import { afterEach, describe, expect, it, vi } from 'vitest';

import { C15tConfigurationError, createC15tClient } from '../index';
import type { C15tClientOptions, C15tConfigurationIssue } from '../index';
import { errorOf } from './result-helpers';

const STATUS_BODY = {
	client: {},
	timestamp: '2026-01-01T00:00:00.000Z',
	version: '3.0.0',
};

const okFetch = () =>
	vi.fn<typeof fetch>(() =>
		Promise.resolve(
			new Response(JSON.stringify(STATUS_BODY), {
				headers: { 'content-type': 'application/json' },
			})
		)
	);

/** The issues `createC15tClient` throws for these options. */
const issuesFor = (options: unknown): readonly C15tConfigurationIssue[] => {
	try {
		createC15tClient(options as C15tClientOptions);
	} catch (error) {
		expect(error).toBeInstanceOf(C15tConfigurationError);
		return (error as C15tConfigurationError).issues;
	}
	throw new Error('Expected createC15tClient to throw.');
};

const optionsIn = (issues: readonly C15tConfigurationIssue[]) =>
	issues.map((issue) => issue.option);

/** The first request a fetch mock received. */
const firstRequest = (fetchMock: ReturnType<typeof okFetch>): Request => {
	const [call] = fetchMock.mock.calls;
	if (call === undefined) {
		throw new Error('fetch was not called');
	}
	return new Request(...call);
};

afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

describe('createC15tClient options', () => {
	it('throws one error listing every problem', () => {
		let thrown: unknown;
		try {
			createC15tClient({
				apiKey: '',
				baseUrl: 'ftp://example.com',
				headers: { 'x-count': 1 },
				onEvent: 'log',
				retry: { initialDelayMs: -1, maxDelayMs: 1.5, maxRetries: 11 },
				timeoutMs: 0,
			} as unknown as C15tClientOptions);
		} catch (error) {
			thrown = error;
		}

		expect(thrown).toBeInstanceOf(C15tConfigurationError);
		const error = thrown as C15tConfigurationError;
		expect(new Set(optionsIn(error.issues))).toEqual(
			new Set([
				'apiKey',
				'baseUrl',
				'headers',
				'onEvent',
				'retry.initialDelayMs',
				'retry.maxDelayMs',
				'retry.maxRetries',
				'timeoutMs',
			])
		);
		expect(error.name).toBe('C15tConfigurationError');
		expect(error.message).toContain('8 problems');
		expect(error.message).toContain('- baseUrl:');
	});

	it('refuses a missing options object', () => {
		expect(optionsIn(issuesFor(undefined))).toEqual(['options']);
	});

	it.each([
		['a missing base URL', undefined],
		['a relative URL', '/api/c15t'],
		['a non-http scheme', 'ftp://example.com/api/c15t'],
		['a query string', 'https://example.com/api/c15t?tenant=a'],
		['a fragment', 'https://example.com/api/c15t#top'],
	])('refuses %s', (_name, baseUrl) => {
		const issues = issuesFor({ baseUrl, fetch: okFetch() });

		expect(optionsIn(issues)).toEqual(['baseUrl']);
		expect(issues[0]?.message).toEqual(expect.any(String));
	});

	it('refuses http: with an API key on a non-loopback host', () => {
		const issues = issuesFor({
			apiKey: 'sk_test',
			baseUrl: 'http://consent.example.com/api/c15t',
			fetch: okFetch(),
		});

		expect(optionsIn(issues)).toEqual(['baseUrl']);
		expect(issues[0]?.message).toContain('https:');
	});

	it.each([
		'http://localhost:3000/api/c15t',
		'http://127.0.0.1:3000/api/c15t',
		'http://[::1]:3000/api/c15t',
	])('accepts http: with an API key on %s', async (baseUrl) => {
		const fetchMock = okFetch();
		const client = createC15tClient({
			apiKey: 'sk_test',
			baseUrl,
			fetch: fetchMock,
		});

		const result = await client.status();

		expect(result.ok).toBe(true);
		expect(firstRequest(fetchMock).url).toBe(`${baseUrl}/status`);
	});

	it('accepts http: without an API key on any host', () => {
		expect(() =>
			createC15tClient({ baseUrl: 'http://consent.example.com/api/c15t' })
		).not.toThrow();
	});

	it.each(['https://api.test/api/c15t', 'https://api.test/api/c15t/'])(
		'normalises %s so routes keep the prefix',
		async (baseUrl) => {
			const fetchMock = okFetch();
			const client = createC15tClient({ baseUrl, fetch: fetchMock });

			await client.status();

			expect(firstRequest(fetchMock).url).toBe(
				'https://api.test/api/c15t/status'
			);
		}
	);

	it('accepts a URL object and leaves it unchanged', async () => {
		const baseUrl = new URL('https://api.test/api/c15t');
		const fetchMock = okFetch();
		const client = createC15tClient({ baseUrl, fetch: fetchMock });

		await client.status();

		expect(baseUrl.href).toBe('https://api.test/api/c15t');
		expect(firstRequest(fetchMock).url).toBe(
			'https://api.test/api/c15t/status'
		);
	});

	it('reads no environment variables', () => {
		vi.stubEnv('C15T_API_URL', 'https://env.example.com/api/c15t');
		vi.stubEnv('C15T_API_TOKEN', 'sk_from_env');

		expect(optionsIn(issuesFor({}))).toEqual(['baseUrl']);
	});

	it('does not send an API key taken from the environment', async () => {
		vi.stubEnv('C15T_API_TOKEN', 'sk_from_env');
		vi.stubEnv('C15T_API_KEY', 'sk_from_env');
		const fetchMock = okFetch();
		const client = createC15tClient({
			baseUrl: 'https://api.test/api/c15t',
			fetch: fetchMock,
		});

		await client.status();

		const request = firstRequest(fetchMock);
		expect(request.headers.has('authorization')).toBe(false);
	});

	it('uses the global fetch when none is passed', async () => {
		const fetchMock = okFetch();
		vi.stubGlobal('fetch', fetchMock);
		const client = createC15tClient({ baseUrl: 'https://api.test/api/c15t' });

		await client.status();

		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('refuses to build without any fetch', () => {
		vi.stubGlobal('fetch', undefined);

		expect(
			optionsIn(issuesFor({ baseUrl: 'https://api.test/api/c15t' }))
		).toEqual(['fetch']);
	});

	it.each([
		['retry', 'off', ['retry']],
		['timeoutMs', Number.POSITIVE_INFINITY, ['timeoutMs']],
		['timeoutMs', 1.5, ['timeoutMs']],
		['timeoutMs', 2 ** 31, ['timeoutMs']],
		['timeoutMs', 2 ** 32, ['timeoutMs']],
		['retry', { initialDelayMs: 2 ** 31 }, ['retry.initialDelayMs']],
		['retry', { maxDelayMs: 2 ** 31 }, ['retry.maxDelayMs']],
		['headers', ['x-a', 'b'], ['headers']],
	])('refuses %s: %o', (option, value, expected) => {
		const issues = issuesFor({
			baseUrl: 'https://api.test/api/c15t',
			fetch: okFetch(),
			[option]: value,
		});

		expect(optionsIn(issues)).toEqual(expected);
	});
});

describe('call options', () => {
	const createClient = (fetchMock: typeof fetch) =>
		createC15tClient({
			apiKey: 'sk_test',
			baseUrl: 'https://api.test/api/c15t',
			fetch: fetchMock,
		});

	it.each([
		[{ timeoutMs: -1 }, ['options', 'timeoutMs']],
		[{ timeoutMs: Number.NaN }, ['options', 'timeoutMs']],
		[{ timeoutMs: 1.5 }, ['options', 'timeoutMs']],
		[{ timeoutMs: 2 ** 31 }, ['options', 'timeoutMs']],
		[{ timeoutMs: 2 ** 32 }, ['options', 'timeoutMs']],
		[
			{ retry: { initialDelayMs: 2 ** 31 } },
			['options', 'retry', 'initialDelayMs'],
		],
		[{ retry: { maxDelayMs: 2 ** 31 } }, ['options', 'retry', 'maxDelayMs']],
		[{ requestId: '' }, ['options', 'requestId']],
		[{ signal: 'stop' }, ['options', 'signal']],
		[{ headers: { 'x-count': 2 } }, ['options', 'headers']],
		[{ retry: { maxRetries: -1 } }, ['options', 'retry', 'maxRetries']],
		[{ retry: 'never' }, ['options', 'retry']],
		['fast', ['options']],
	])(
		'refuses %o as INVALID_INPUT without throwing or sending',
		async (callOptions, path) => {
			const fetchMock = okFetch();
			const client = createClient(fetchMock);

			const error = errorOf(await client.status(callOptions as never));

			expect(error.code).toBe('INVALID_INPUT');
			expect(error.issues).toContainEqual(expect.objectContaining({ path }));
			expect(fetchMock).not.toHaveBeenCalled();
		}
	);

	it('reports bad call options together with bad input', async () => {
		const fetchMock = okFetch();
		const client = createClient(fetchMock);

		const error = errorOf(
			await client.subjects.get('', undefined, { timeoutMs: -1 })
		);

		expect(error.issues?.map((issue) => issue.path)).toEqual([
			['options', 'timeoutMs'],
			['id'],
		]);
		expect(error.message).toContain('options.timeoutMs');
	});
});

it('accepts the largest supported timeout and retry delays', async () => {
	const fetchMock = okFetch();
	const timeoutMs = 2 ** 31 - 1;
	const retry = { initialDelayMs: timeoutMs, maxDelayMs: timeoutMs };
	const client = createC15tClient({
		baseUrl: 'https://api.test',
		fetch: fetchMock,
		retry,
		timeoutMs,
	});
	await expect(client.status()).resolves.toMatchObject({ ok: true });
	await expect(client.status({ retry, timeoutMs })).resolves.toMatchObject({
		ok: true,
	});
});
