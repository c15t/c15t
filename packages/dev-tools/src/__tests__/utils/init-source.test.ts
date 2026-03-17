import { describe, expect, it } from 'vitest';
import { formatInitSource } from '../../utils/init-source';

describe('formatInitSource', () => {
	it('formats backend cache hit source with detail', () => {
		expect(
			formatInitSource('backend-cache-hit', 'x-vercel-cache=HIT, age=12')
		).toBe('Backend (Cache Hit) [x-vercel-cache=HIT, age=12]');
	});

	it('formats offline fallback source', () => {
		expect(formatInitSource('offline-fallback', null)).toBe('Offline Fallback');
	});

	it('returns em dash for unavailable source', () => {
		expect(formatInitSource(null, null)).toBe('—');
	});
});
