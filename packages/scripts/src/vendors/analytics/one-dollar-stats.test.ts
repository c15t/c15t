import { describe, expect, it } from 'vitest';
import { expectScriptMatchesIntegration } from '../../__tests__/helpers';
import { type OneDollarStatsOptions, oneDollarStats } from './one-dollar-stats';

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
			hostname: 'docs.example.com',
			devmode: 'true',
			url: 'https://analytics.example.com/events',
			autocollect: 'false',
			'hash-routing': 'true',
			'future-setting': '{{literal}}',
		});
		expect(script.attributes).toEqual({
			'data-hostname': 'docs.example.com',
			'data-devmode': 'true',
			'data-url': 'https://analytics.example.com/events',
			'data-autocollect': 'false',
			'data-hash-routing': 'true',
			'data-future-setting': '{{literal}}',
		});
	});

	it('omits false hash routing but preserves other false-valued attributes', () => {
		expect(
			oneDollarStats({
				'hash-routing': 'false',
				devmode: 'false',
				autocollect: 'false',
			}).attributes
		).toEqual({
			'data-devmode': 'false',
			'data-autocollect': 'false',
		});
		expect(oneDollarStats({ 'hash-routing': '' }).attributes).toEqual({
			'data-hash-routing': '',
		});
	});

	it.each([
		'docs.example.com',
		'localhost:3000',
		'例え.jp',
		'my-site.example',
	])('accepts bare hostname %s', (hostname) => {
		expect(oneDollarStats({ hostname }).attributes?.['data-hostname']).toBe(
			hostname
		);
	});

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
			oneDollarStats({ hostname: undefined, devmode: undefined }).attributes
		).toEqual({});
		expect(() =>
			oneDollarStats({ autocollect: false } as unknown as OneDollarStatsOptions)
		).toThrow('autocollect must be a string');
	});

	it('keeps configurations independent and cannot override script properties via options', () => {
		const first = oneDollarStats({
			src: 'https://example.com/other.js',
			defer: 'false',
		});
		expect(first.src).toBe('https://assets.onedollarstats.com/stonks.js');
		expect(first.defer).toBe(true);
		expect(first.attributes).toEqual({
			'data-src': 'https://example.com/other.js',
			'data-defer': 'false',
		});
		expect(oneDollarStats().attributes).toEqual({});
	});
});
