import { describe, expect, it } from 'vitest';

import { expectScriptMatchesIntegration } from '../../__tests__/helpers';
import { oneDollarStats } from './one-dollar-stats';
import type { OneDollarStatsOptions } from './one-dollar-stats';

describe('oneDollarStats', () => {
	it('requires no configuration and matches the registry', () => {
		const script = oneDollarStats();
		expectScriptMatchesIntegration('oneDollarStats', script, {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://assets.onedollarstats.com/stonks.js',
		});
		expect(script.defer).toBe(true);
		expect(script.attributes).toEqual({});
	});

	it('forwards known and future settings without interpreting their values', () => {
		const script = oneDollarStats({
			autocollect: 'false',
			devmode: 'true',
			'future-setting': '{{literal}}',
			'hash-routing': 'true',
			hostname: 'docs.example.com',
			url: 'https://analytics.example.com/events',
		});
		expect(script.attributes).toEqual({
			'data-autocollect': 'false',
			'data-devmode': 'true',
			'data-future-setting': '{{literal}}',
			'data-hash-routing': 'true',
			'data-hostname': 'docs.example.com',
			'data-url': 'https://analytics.example.com/events',
		});
	});

	it('omits false hash routing but preserves other false-valued attributes', () => {
		expect(
			oneDollarStats({
				autocollect: 'false',
				devmode: 'false',
				'hash-routing': 'false',
			}).attributes
		).toEqual({
			'data-autocollect': 'false',
			'data-devmode': 'false',
		});
		expect(oneDollarStats({ 'hash-routing': '' }).attributes).toEqual({
			'data-hash-routing': '',
		});
	});

	it.each(['docs.example.com', 'localhost:3000', '例え.jp', 'my-site.example'])(
		'accepts bare hostname %s',
		(hostname) => {
			expect(oneDollarStats({ hostname }).attributes?.['data-hostname']).toBe(
				hostname
			);
		}
	);

	it.each([
		'',
		'https://example.com',
		'example.com/path',
		'example.com?x=1',
		'example.com#hash',
		'example..com',
		'example/com',
		' example.com ',
	])('rejects malformed hostname %s', (hostname) => {
		expect(() => oneDollarStats({ hostname })).toThrow(
			'hostname must be a bare host name'
		);
	});

	it('omits undefined options and rejects non-string settings from JavaScript', () => {
		expect(
			oneDollarStats({ devmode: undefined, hostname: undefined }).attributes
		).toEqual({});
		expect(() =>
			oneDollarStats({ autocollect: false } as unknown as OneDollarStatsOptions)
		).toThrow('autocollect must be a string');
	});

	it('rejects setting names that are not valid data attribute names', () => {
		expect(() => oneDollarStats({ 'foo bar': 'true' })).toThrow(
			'foo bar is not a valid setting name'
		);
		expect(() => oneDollarStats({ DevMode: 'true' })).toThrow(
			'DevMode is not a valid setting name'
		);
	});

	it('keeps configurations independent and cannot override script properties via options', () => {
		const first = oneDollarStats({
			defer: 'false',
			src: 'https://example.com/other.js',
		});
		expect(first.src).toBe('https://assets.onedollarstats.com/stonks.js');
		expect(first.defer).toBe(true);
		expect(first.attributes).toEqual({
			'data-defer': 'false',
			'data-src': 'https://example.com/other.js',
		});
		expect(oneDollarStats().attributes).toEqual({});
	});
});
