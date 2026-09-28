/**
 * `emitConsentSession` and `detachConsentSession` in isolation: where a
 * sink failure is logged, and how a detached emission stays alive.
 *
 * The route tests in `app.test.ts` cover the wire; these cover the two
 * things a route test cannot see, because they happen after its response.
 */

import type { ConsentSessionReport } from '@c15t/schema/types';
import type { Context } from 'hono';
import { describe, expect, test, vi } from 'vitest';

import { detachConsentSession, emitConsentSession } from './session';

const report: ConsentSessionReport = {
	country: 'DE',
	gpc: false,
	jurisdiction: 'GDPR',
	language: 'de',
	policy: null,
	region: null,
	resolution: 'failed',
	revision: 'rev-1',
	source: 'init',
};

const failingSink = {
	sessions: { onReport: () => Promise.reject(new Error('sink down')) },
};

const context = function context(input: {
	log?: { error: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> };
	executionCtx?: { waitUntil: ReturnType<typeof vi.fn> };
}): Context {
	const fake = {
		get: (key: string) => (key === 'log' ? input.log : undefined),
		req: { raw: new Request('https://consent.example.com/init') },
	};
	Object.defineProperty(fake, 'executionCtx', {
		get() {
			if (!input.executionCtx) {
				throw new Error('This context has no ExecutionContext');
			}
			return input.executionCtx;
		},
	});
	return fake as unknown as Context;
};

describe('emitConsentSession', () => {
	test('an awaited sink failure lands on the request event', async () => {
		const log = { error: vi.fn(), set: vi.fn() };
		const logDetachedFailure = vi.fn();
		await emitConsentSession(context({ log }), failingSink, report, {
			delivery: 'awaited',
			ip: 'report',
			logDetachedFailure,
		});
		expect(log.error).toHaveBeenCalledTimes(1);
		expect(logDetachedFailure).not.toHaveBeenCalled();
	});

	test('a detached sink failure is logged as its own event, not dropped', async () => {
		// By the time a detached sink fails the request's wide event has been
		// emitted, and the request logger discards anything written to it
		// afterwards. It is bypassed on purpose so the failure stays visible.
		const log = { error: vi.fn(), set: vi.fn() };
		const logDetachedFailure = vi.fn();
		await emitConsentSession(context({ log }), failingSink, report, {
			delivery: 'detached',
			ip: 'connection',
			logDetachedFailure,
		});
		expect(log.error).not.toHaveBeenCalled();
		expect(logDetachedFailure).toHaveBeenCalledTimes(1);
		expect(logDetachedFailure.mock.calls[0]?.[0]).toMatchObject({
			error: { message: 'sink down' },
			session: { sink: 'failed', source: 'init' },
		});
	});

	test('a detached failure stays quiet when observability is silent', async () => {
		const logDetachedFailure = vi.fn();
		await emitConsentSession(
			context({}),
			{ ...failingSink, observability: { level: 'silent' } },
			report,
			{ delivery: 'detached', ip: 'connection', logDetachedFailure }
		);
		expect(logDetachedFailure).not.toHaveBeenCalled();
	});
});

describe('detachConsentSession', () => {
	test("registers the emission with the runtime's waitUntil", () => {
		const waitUntil = vi.fn();
		const emission = Promise.resolve();
		detachConsentSession(context({ executionCtx: { waitUntil } }), emission);
		expect(waitUntil).toHaveBeenCalledWith(emission);
	});

	test('tolerates a runtime with no execution context', () => {
		expect(() =>
			detachConsentSession(context({}), Promise.resolve())
		).not.toThrow();
	});
});
