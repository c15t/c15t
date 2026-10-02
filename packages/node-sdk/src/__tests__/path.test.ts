import { describe, expect, it } from 'vitest';

import { buildPath } from '../path';

describe('buildPath', () => {
	it('fills every param', () => {
		expect(
			buildPath('/legal-documents/:type/current', { type: 'privacy_policy' })
		).toBe('/legal-documents/privacy_policy/current');
		expect(buildPath('/a/:first/b/:second', { first: '1', second: '2' })).toBe(
			'/a/1/b/2'
		);
	});

	it('leaves a template without params unchanged', () => {
		expect(buildPath('/status', {})).toBe('/status');
	});

	it.each([
		['a/b', 'a%2Fb'],
		['a?b=c', 'a%3Fb%3Dc'],
		['a#b', 'a%23b'],
		['a b', 'a%20b'],
		['100%', '100%25'],
		['ü', '%C3%BC'],
	])('encodes %j as one segment', (value, encoded) => {
		expect(buildPath('/subjects/:id', { id: value })).toBe(
			`/subjects/${encoded}`
		);
	});
});
