import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { C15TClient, c15tClient } from './index';

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
	vi.stubEnv('C15T_API_URL', '');
	vi.stubEnv('C15T_API_TOKEN', '');
	fetchMock.mockReset();
	fetchMock.mockImplementation(() =>
		Promise.resolve(Response.json({ version: 'test' }))
	);
	vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

test('the factory returns a client', () => {
	expect(c15tClient({ baseUrl: 'https://api.test' })).toBeInstanceOf(
		C15TClient
	);
});

test('sends authorization and custom headers', async () => {
	const client = c15tClient({
		baseUrl: 'https://api.test',
		headers: { 'X-Custom-Header': 'test-value' },
		token: 'test-token',
	});
	await client.status();
	const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
	expect(headers.get('authorization')).toBe('Bearer test-token');
	expect(headers.get('x-custom-header')).toBe('test-value');
});

test.each([
	['https://api.test', undefined, 'https://api.test/status'],
	['https://api.test/existing', undefined, 'https://api.test/existing/status'],
	['https://api.test', '/api/v1', 'https://api.test/api/v1/status'],
	['https://api.test/existing', '/api/v1', 'https://api.test/api/v1/status'],
])(
	'resolves requests from %s with prefix %s',
	async (baseUrl, prefix, expected) => {
		await c15tClient({ baseUrl, prefix }).status();
		expect(fetchMock.mock.calls[0]?.[0]).toBe(expected);
	}
);

test.each(['invalid-url', ''])('rejects invalid base URL %s', (baseUrl) => {
	expect(() => c15tClient({ baseUrl })).toThrow(TypeError);
});

test('honors the configured retry limit', async () => {
	fetchMock.mockImplementation(() =>
		Promise.resolve(new Response(null, { status: 503 }))
	);
	const result = await c15tClient({
		baseUrl: 'https://api.test',
		retryConfig: { initialDelayMs: 0, maxRetries: 1 },
	}).status();
	expect(result.ok).toBe(false);
	expect(result.error?.status).toBe(503);
	expect(fetchMock).toHaveBeenCalledTimes(2);
});
