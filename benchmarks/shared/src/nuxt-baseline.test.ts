import { expect, it } from 'vitest';

import { assertConsentFreeBaseline } from '../../nuxt-browser-bench/scripts/baseline';

const empty = {
	bannerCount: 0,
	bannerInFirstHtml: false,
	initRequests: 0,
	manifestRequests: 0,
};

it('accepts a module-free baseline', () => {
	expect(() => assertConsentFreeBaseline(empty)).not.toThrow();
});

it.each([
	{ bannerInFirstHtml: true },
	{ bannerCount: 1 },
	{ initRequests: 1 },
	{ manifestRequests: 1 },
])('rejects consent loading on a baseline: %j', (observation) => {
	expect(() => assertConsentFreeBaseline({ ...empty, ...observation })).toThrow(
		'Zero-consent baseline loaded consent UI or transport'
	);
});
