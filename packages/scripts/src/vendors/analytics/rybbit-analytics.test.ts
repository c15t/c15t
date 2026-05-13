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
			siteId: 'rybbit-123',
			analyticsHost: 'https://analytics.example.com',
		});

		expect(script.src).toBe('https://analytics.example.com/script.js');
	});

	it('ignores blank scriptUrl overrides', () => {
		const script = rybbitAnalytics({
			siteId: 'rybbit-123',
			analyticsHost: 'https://analytics.example.com',
			scriptUrl: '   ',
		});

		expect(script.src).toBe('https://analytics.example.com/script.js');
	});

	it('normalizes trailing slashes in analyticsHost', () => {
		const script = rybbitAnalytics({
			siteId: 'rybbit-123',
			analyticsHost: 'https://analytics.example.com///',
		});

		expect(script.src).toBe('https://analytics.example.com/script.js');
	});

	it('maps options to script data attributes', () => {
		const script = rybbitAnalytics({
			siteId: 'rybbit-123',
			autoTrackPageview: true,
			trackSpa: false,
			trackQuery: true,
			trackOutbound: true,
			trackErrors: false,
			sessionReplay: true,
			webVitals: true,
			skipPatterns: ['/admin'],
			maskPatterns: ['/private'],
			debounce: 500,
			apiKey: 'secret-key',
		});

		expect(script.attributes).toEqual({
			'data-site-id': 'rybbit-123',
			'data-auto-track-pageview': 'true',
			'data-track-spa': 'false',
			'data-track-query': 'true',
			'data-track-outbound': 'true',
			'data-track-errors': 'false',
			'data-session-replay': 'true',
			'data-web-vitals': 'true',
			'data-skip-patterns': '["/admin"]',
			'data-mask-patterns': '["/private"]',
			'data-debounce': '500',
			'data-api-key': 'secret-key',
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
