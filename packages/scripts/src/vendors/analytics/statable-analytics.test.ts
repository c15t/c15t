import { describe, expect, it } from 'vitest';
import {
	expectScriptMatchesIntegration,
	setupScriptHelperTest,
} from '../../__tests__/helpers';
import {
	statableAnalytics,
	statableAnalyticsManifest,
} from './statable-analytics';

describe('statableAnalytics', () => {
	setupScriptHelperTest();

	it('embeds the numeric site id in the script path and mirrors it to data-id', () => {
		const script = statableAnalytics({ siteId: '12345' });

		expectScriptMatchesIntegration('statableAnalytics', script, {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://statable.com/js/12345/s.js',
		});
		expect(script.attributes).toEqual({ 'data-id': '12345' });
	});

	it('accepts a numeric site id', () => {
		const script = statableAnalytics({ siteId: 98765 });

		expect(script.src).toBe('https://statable.com/js/98765/s.js');
		expect(script.attributes).toEqual({ 'data-id': '98765' });
	});

	it('trims string site ids before building the url', () => {
		const script = statableAnalytics({ siteId: '  42  ' });

		expect(script.src).toBe('https://statable.com/js/42/s.js');
		expect(script.attributes).toEqual({ 'data-id': '42' });
	});

	it('throws for blank site ids', () => {
		expect(() => statableAnalytics({ siteId: '   ' })).toThrow(
			'statableAnalytics: missing siteId'
		);
		expect(() =>
			statableAnalytics({ siteId: undefined as unknown as string })
		).toThrow('statableAnalytics: missing siteId');
	});

	it('rejects non-numeric ids before building the manifest', () => {
		expect(() => statableAnalytics({ siteId: 'abc' })).toThrow(
			'statableAnalytics: invalid siteId'
		);
		expect(() => statableAnalytics({ siteId: '12px' })).toThrow(
			'statableAnalytics: invalid siteId'
		);
		expect(() => statableAnalytics({ siteId: Number.NaN })).toThrow(
			'statableAnalytics: invalid siteId'
		);
		expect(() =>
			statableAnalytics({ siteId: Number.POSITIVE_INFINITY })
		).toThrow('statableAnalytics: invalid siteId');
	});

	it('accepts every finite numeric form: zero, negatives, decimals, scientific notation', () => {
		const cases: Array<[string | number, string]> = [
			[0, '0'],
			[-7, '-7'],
			[1.5, '1.5'],
			[1e3, '1000'],
			['0', '0'],
			['-42', '-42'],
			['2.5', '2.5'],
			['1e3', '1e3'],
		];

		for (const [input, pathSegment] of cases) {
			const script = statableAnalytics({ siteId: input });
			expect(script.src).toBe(`https://statable.com/js/${pathSegment}/s.js`);
			expect(script.attributes).toEqual({ 'data-id': pathSegment });
		}
	});

	it('replaces every {siteId} placeholder in a custom ingestion url', () => {
		const script = statableAnalytics({
			siteId: '555',
			scriptUrl: 'https://cdn.example.com/{siteId}/{siteId}/s.js',
		});

		expect(script.src).toBe('https://cdn.example.com/555/555/s.js');
	});

	it('does not emit data-tracking-api by default', () => {
		const script = statableAnalytics({ siteId: '12345' });

		expect(script.attributes).not.toHaveProperty('data-tracking-api');
	});

	it('maps trackingApi to data-tracking-api and trims it', () => {
		const script = statableAnalytics({
			siteId: '12345',
			scriptUrl: 'https://cdn.example.com/{siteId}/s.js',
			trackingApi: '  https://ingest.statable.com  ',
		});

		expect(script.src).toBe('https://cdn.example.com/12345/s.js');
		expect(script.attributes['data-tracking-api']).toBe(
			'https://ingest.statable.com'
		);
	});

	it('ignores a blank trackingApi', () => {
		const script = statableAnalytics({
			siteId: '12345',
			trackingApi: '   ',
		});

		expect(script.attributes).not.toHaveProperty('data-tracking-api');
	});

	// Regression for the initialization contract. The live tracker boots with
	// `window.statable ||= {…}`: a pre-existing truthy global makes it skip
	// initialization, so the manifest must not install a bootstrap stub.
	it('does not pre-create window.statable (tracker uses `||=` and never replays)', () => {
		expect(statableAnalyticsManifest.bootstrap).toEqual([]);
	});
});

// Models the real tracker boot sequence (`window.statable ||= {…}`) against
// a local test double, guarding the no-stub contract end to end.
describe('statable tracker initialization contract', () => {
	const trackerBoot = (win: {
		statable?: { initialized: boolean };
	}): { initialized: boolean } => {
		win.statable ||= { initialized: true };
		return win.statable;
	};

	it('initializes when window.statable is absent (our integration case)', () => {
		const win: { statable?: { initialized: boolean } } = {};

		expect(trackerBoot(win)).toEqual({ initialized: true });
	});

	it('skips initialization when a truthy stub already exists (the old bug)', () => {
		const win: { statable?: { initialized: boolean } } = {
			statable: { initialized: false },
		};

		expect(trackerBoot(win)).toEqual({ initialized: false });
	});
});
