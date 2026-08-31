import { describe, expect, it } from 'vitest';

import {
	expectScriptMatchesIntegration,
	setupScriptHelperTest,
} from '../../__tests__/helpers';
import { rybbitAnalytics } from './rybbit-analytics';

describe('rybbitAnalytics', () => {
	setupScriptHelperTest();

	it('matches registry metadata with default loader URL', () => {
		const script = rybbitAnalytics({ siteId: 'rybbit-123' });

		expectScriptMatchesIntegration('rybbitAnalytics', script, {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://app.rybbit.io/api/script.js',
		});
	});

	it('derives loader URL from analyticsHost when scriptUrl is omitted', () => {
		const script = rybbitAnalytics({
			analyticsHost: 'https://analytics.example.com',
			siteId: 'rybbit-123',
		});

		expect(script.src).toBe('https://analytics.example.com/script.js');
	});

	it('ignores blank scriptUrl overrides', () => {
		const script = rybbitAnalytics({
			analyticsHost: 'https://analytics.example.com',
			scriptUrl: '   ',
			siteId: 'rybbit-123',
		});

		expect(script.src).toBe('https://analytics.example.com/script.js');
	});

	it('normalizes trailing slashes in analyticsHost', () => {
		const script = rybbitAnalytics({
			analyticsHost: 'https://analytics.example.com///',
			siteId: 'rybbit-123',
		});

		expect(script.src).toBe('https://analytics.example.com/script.js');
	});

	it('maps options to script data attributes', () => {
		const script = rybbitAnalytics({
			apiKey: 'secret-key',
			autoTrackPageview: true,
			debounce: 500,
			maskPatterns: ['/private'],
			sessionReplay: true,
			siteId: 'rybbit-123',
			skipPatterns: ['/admin'],
			trackErrors: false,
			trackOutbound: true,
			trackQuery: true,
			trackSpa: false,
			webVitals: true,
		});

		expect(script.attributes).toEqual({
			'data-api-key': 'secret-key',
			'data-auto-track-pageview': 'true',
			'data-debounce': '500',
			'data-mask-patterns': '["/private"]',
			'data-session-replay': 'true',
			'data-site-id': 'rybbit-123',
			'data-skip-patterns': '["/admin"]',
			'data-track-errors': 'false',
			'data-track-outbound': 'true',
			'data-track-query': 'true',
			'data-track-spa': 'false',
			'data-web-vitals': 'true',
		});
	});

	it('trims site IDs before setting data attributes', () => {
		const script = rybbitAnalytics({ siteId: '  rybbit-123  ' });

		expect(script.attributes?.['data-site-id']).toBe('rybbit-123');
	});

	it('throws for blank site IDs', () => {
		expect(() => rybbitAnalytics({ siteId: '   ' })).toThrow(
			'rybbitAnalytics: missing siteId'
		);
		expect(() =>
			rybbitAnalytics({ siteId: undefined as unknown as string })
		).toThrow('rybbitAnalytics: missing siteId');
		expect(() =>
			rybbitAnalytics({ siteId: null as unknown as string })
		).toThrow('rybbitAnalytics: missing siteId');
	});
});
