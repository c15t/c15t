/**
 * The default App Router request context has to mark the work request-time
 * before `resolveConsent` reads the clock. Under `cacheComponents` with
 * `partialPrefetching`, Next resolves `headers()` inside the runtime
 * prefetch and then rejects the `Date.now()` that follows as sync IO.
 */
import { afterEach, expect, test, vi } from 'vitest';

const order: string[] = [];

// oxlint-disable-next-line anti-slop/no-module-mocking -- Next supplies these request-scoped modules only inside its own runtime; the default context is the code under test, so its imports are what has to be observed.
vi.mock('next/headers.js', () => ({
	cookies: vi.fn(() => ({ toString: () => '' })),
	headers: vi.fn(() => {
		order.push('headers');
		return Promise.resolve(new Headers({ 'x-vercel-ip-country': 'DE' }));
	}),
}));

// oxlint-disable-next-line anti-slop/no-module-mocking -- Same as above: `connection()` only exists inside Next's runtime.
vi.mock('next/server.js', () => ({
	connection: vi.fn(() => {
		order.push('connection');
		return Promise.resolve();
	}),
}));

afterEach(() => {
	vi.restoreAllMocks();
});

test('the default request context awaits connection() before the clock is read', async () => {
	const { connection } = await import('next/server.js');
	const { resolveConsent } = await import('../server');
	const realNow = Date.now;
	vi.spyOn(Date, 'now').mockImplementation(() => {
		order.push('now');
		return realNow();
	});
	order.length = 0;

	const state = await resolveConsent();

	expect(connection).toHaveBeenCalledTimes(1);
	expect(order.slice(0, 2)).toEqual(['connection', 'headers']);
	expect(order.indexOf('now')).toBeGreaterThan(order.indexOf('headers'));
	expect(state.initialOverrides?.country).toBe('DE');
});
