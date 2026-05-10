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
			'data-site': 'SITE123',
			'data-spa': undefined,
			'data-auto': undefined,
			'data-canonical': undefined,
			'data-honor-dnt': undefined,
		});
	});

	it('serializes boolean options as "true" / "false" strings', () => {
		const script = fathomAnalytics({
			site: 'SITE123',
			spa: 'history',
			auto: false,
			canonical: true,
			honorDnt: true,
		});

		expect(script.attributes).toEqual({
			'data-site': 'SITE123',
			'data-spa': 'history',
			'data-auto': 'false',
			'data-canonical': 'true',
			'data-honor-dnt': 'true',
		});
	});

	it('honors a custom loader URL', () => {
		const script = fathomAnalytics({
			site: 'SITE123',
			scriptUrl: 'https://cdn.example.com/fathom.js',
		});

		expect(script.src).toBe('https://cdn.example.com/fathom.js');
	});
});
