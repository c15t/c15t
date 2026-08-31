import { describe, expect, it } from 'vitest';

import {
	expectScriptMatchesIntegration,
	setupScriptHelperTest,
} from '../../__tests__/helpers';
import { fathomAnalytics } from './fathom-analytics';

describe('fathomAnalytics', () => {
	setupScriptHelperTest();

	it('matches registry metadata with the default loader', () => {
		const script = fathomAnalytics({ site: 'SITE123' });

		expectScriptMatchesIntegration('fathomAnalytics', script, {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://cdn.usefathom.com/script.js',
		});
		expect(script.attributes).toEqual({
			'data-auto': undefined,
			'data-canonical': undefined,
			'data-honor-dnt': undefined,
			'data-site': 'SITE123',
			'data-spa': undefined,
		});
	});

	it('serializes boolean options as "true" / "false" strings', () => {
		const script = fathomAnalytics({
			auto: false,
			canonical: true,
			honorDnt: true,
			site: 'SITE123',
			spa: 'history',
		});

		expect(script.attributes).toEqual({
			'data-auto': 'false',
			'data-canonical': 'true',
			'data-honor-dnt': 'true',
			'data-site': 'SITE123',
			'data-spa': 'history',
		});
	});

	it('honors a custom loader URL', () => {
		const script = fathomAnalytics({
			scriptUrl: 'https://cdn.example.com/fathom.js',
			site: 'SITE123',
		});

		expect(script.src).toBe('https://cdn.example.com/fathom.js');
	});
});
