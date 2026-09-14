import { afterEach, describe, expect, it, vi } from 'vitest';

import { startFixtureServer } from '../../../internals/next-compat/shared/src/fixture/standalone';
import { startExampleFixture } from './fixture';

afterEach(() => vi.restoreAllMocks());

describe.each([
	['example', startExampleFixture],
	['standalone', startFixtureServer],
] as const)('%s fixture errors', (_name, start) => {
	it('keeps request errors in server logs and returns plain text', async () => {
		const log = vi.spyOn(console, 'error').mockImplementation(() => {});
		const server = await start();
		try {
			const response = await fetch(server.backendURL, {
				headers: { 'x-forwarded-host': '<private-host>' },
			});
			expect(response.status).toBe(500);
			expect(await response.text()).toBe('Fixture request failed');
			expect(response.headers.get('content-type')).toBe(
				'text/plain; charset=utf-8'
			);
			expect(response.headers.get('x-content-type-options')).toBe('nosniff');
			expect(log).toHaveBeenCalledWith(
				'Fixture request failed',
				expect.any(Error)
			);
		} finally {
			await server.close();
		}
	});
});
