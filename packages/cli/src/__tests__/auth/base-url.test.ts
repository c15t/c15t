import { afterEach, describe, expect, it, vi } from 'vitest';

import { getControlPlaneBaseUrl } from '../../auth/base-url';

afterEach(() => vi.unstubAllEnvs());

describe('getControlPlaneBaseUrl', () => {
	it('trims surrounding whitespace and trailing slashes from long paths', () => {
		const baseUrl = `https://example.com/api/${'/'.repeat(100_000)}control`;
		vi.stubEnv('CONSENT_URL', ` ${baseUrl}/// `);
		const start = performance.now();
		const result = getControlPlaneBaseUrl();
		expect(performance.now() - start).toBeLessThan(1_000);
		expect(result).toBe(baseUrl);
	});
});
