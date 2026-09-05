import { describe, expect, it } from 'vitest';

import { getDevToolsDocsPath } from './dev-tools';

describe('DevTools prompt documentation', () => {
	it.each([
		['c15t', 'frameworks/javascript/dev-tools'],
		['c15t/react', 'frameworks/react/components/dev-tools'],
		['c15t/next', 'frameworks/next/components/dev-tools'],
	] as const)('links %s to its own API guide', (pkg, path) => {
		expect(getDevToolsDocsPath(pkg)).toBe(path);
	});
});
