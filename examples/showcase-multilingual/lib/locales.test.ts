import { expect, test } from 'vitest';

import { matchLocale } from './locales';

test.each([
	['de;q=0, en;q=1', 'en'],
	['de;q=0.2, fr;q=0.8', 'fr'],
	['fr;q=0.5, de', 'de'],
	['fr;q=0.8, de;q=0.8', 'fr'],
	['de-DE;q=0.3, FR-ca;q=0.9', 'fr'],
	['es;q=1, fr;q=0.6, de;q=0.5', 'fr'],
	['de;q=0, fr;q=0, en', 'en'],
	['de, fr, en', 'de'],
	['es, it', 'en'],
	['', 'en'],
	[null, 'en'],
] as const)('matches %s to %s', (header, expected) => {
	expect(matchLocale(header)).toBe(expected);
});
