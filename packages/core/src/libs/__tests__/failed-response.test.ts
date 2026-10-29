import { afterEach, describe, expect, test, vi } from 'vitest';

import { failedResponseError } from '../failed-response';

const PREFIX = 'c15t hosted transport: /init';

afterEach(() => {
	vi.useRealTimers();
});

describe('failedResponseError', () => {
	test('reads the message and code of a { message, code } body', async () => {
		const response = Response.json(
			{
				code: 'CONSENT_SESSIONS_EXHAUSTED',
				message:
					'This project is out of consent sessions. Upgrade at https://dashboard.example.com/billing.',
			},
			{ status: 402 }
		);

		const error = await failedResponseError(PREFIX, response);

		expect(error.message).toBe(
			'c15t hosted transport: /init responded 402: This project is out of consent sessions. Upgrade at https://dashboard.example.com/billing. (CONSENT_SESSIONS_EXHAUSTED)'
		);
		expect(error).toMatchObject({
			code: 'CONSENT_SESSIONS_EXHAUSTED',
			status: 402,
		});
	});

	test('reads the code of a { message, cause: { code } } body', async () => {
		const response = Response.json(
			{
				cause: { code: 'STALE_POLICY', reason: 'policy-changed' },
				message: 'The policy changed.',
			},
			{ status: 422 }
		);

		const error = await failedResponseError(PREFIX, response);

		expect(error.message).toBe(
			'c15t hosted transport: /init responded 422: The policy changed. (STALE_POLICY)'
		);
		expect(error).toMatchObject({ code: 'STALE_POLICY', status: 422 });
	});

	test('keeps the status text when the body is not JSON', async () => {
		const response = new Response('<html>Bad gateway</html>', {
			status: 502,
			statusText: 'Bad Gateway',
		});

		const error = await failedResponseError(PREFIX, response);

		expect(error.message).toBe(
			'c15t hosted transport: /init responded 502 Bad Gateway'
		);
		expect(error).toMatchObject({ status: 502 });
		expect(error).not.toHaveProperty('code');
	});

	test('keeps the old message for an empty body without status text', async () => {
		const error = await failedResponseError(
			PREFIX,
			new Response(null, { status: 429 })
		);

		expect(error.message).toBe('c15t hosted transport: /init responded 429 ');
	});

	test('ignores a body larger than it reads', async () => {
		const response = Response.json(
			{ code: 'BIG', message: 'x'.repeat(20_000) },
			{ status: 500, statusText: 'Internal Server Error' }
		);

		const error = await failedResponseError(PREFIX, response);

		expect(error.message).toBe(
			'c15t hosted transport: /init responded 500 Internal Server Error'
		);
	});

	test('stops waiting for a body that never ends', async () => {
		vi.useFakeTimers();
		const response = new Response(
			new ReadableStream({
				start(controller) {
					controller.enqueue(new TextEncoder().encode('{"message":'));
				},
			}),
			{ status: 503, statusText: 'Service Unavailable' }
		);

		const pending = failedResponseError(PREFIX, response);
		await vi.advanceTimersByTimeAsync(2000);

		await expect(pending).resolves.toMatchObject({
			message: 'c15t hosted transport: /init responded 503 Service Unavailable',
			status: 503,
		});
	});
});
