import { describe, expect, test } from 'vitest';

import { normalizeRoutePrefix } from '../route-prefix';

const ROOT_ERROR =
	"@c15t/example: `routePrefix` can't be '/': a consent route at the site root would catch every page. Use a path such as '/api/c15t'.";

describe('normalizeRoutePrefix', () => {
	test.each([
		['/api/c15t', '/api/c15t'],
		['/api/c15t/', '/api/c15t'],
		['/api/c15t//', '/api/c15t'],
	])('normalizes %s to %s', (input, expected) => {
		expect(normalizeRoutePrefix('@c15t/example', input)).toBe(expected);
	});

	test.each(['/', '//', '///'])('rejects %s', (input) => {
		expect(() => normalizeRoutePrefix('@c15t/example', input)).toThrow(
			ROOT_ERROR
		);
	});

	test.each(['api/c15t', '', 'https://example.com/api/c15t', 42])(
		'rejects %j, which is not a path',
		(input) => {
			expect(() => normalizeRoutePrefix('@c15t/example', input)).toThrow(
				"@c15t/example: `routePrefix` must be a path that starts with '/', such as '/api/c15t'."
			);
		}
	);

	test('rejects a prefix that names another host', () => {
		expect(() => normalizeRoutePrefix('@c15t/example', '//cdn/c15t')).toThrow(
			/starts with '\/\/', which reads as another host/u
		);
	});
});
