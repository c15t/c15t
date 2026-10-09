import { describe, expect, it } from 'vitest';

import {
	appendInitParams,
	applyInitParamsToHeaders,
	INIT_PARAM_HEADERS,
} from './init-request-params';
import { POLICY_CONTRACT_HEADER } from './policy-resolution-wire';
import {
	CONSENT_EXPERIMENT_HEADER,
	parseExperimentHeader,
} from './session-report';

describe('init query parameters', () => {
	it('names the header each parameter replaces', () => {
		// The hosted gateway and older backends read these header names; a
		// rename here silently drops the input for them.
		expect(Object.fromEntries(INIT_PARAM_HEADERS)).toEqual({
			c15tCountry: 'x-c15t-country',
			c15tExperiment: CONSENT_EXPERIMENT_HEADER,
			c15tGpc: 'x-c15t-gpc',
			c15tPolicyContract: POLICY_CONTRACT_HEADER,
			c15tRegion: 'x-c15t-region',
			c15tVersion: 'x-c15t-version',
		});
	});

	it('writes every input in a fixed order and keeps a relative URL relative', () => {
		expect(
			appendInitParams('/api/c15t/init?site=shop#top', {
				country: 'DE',
				experiment: { arm: 'a=b', id: 'banner shape' },
				gpc: false,
				policyContract: 1,
				region: 'BE',
				version: '3.0.0',
			})
		).toBe(
			'/api/c15t/init?site=shop&c15tVersion=3.0.0&c15tPolicyContract=1&c15tCountry=DE&c15tRegion=BE&c15tGpc=0&c15tExperiment=banner%2520shape%3Da%253Db#top'
		);
	});

	it('leaves out absent inputs, and the URL alone when there are none', () => {
		expect(appendInitParams('https://c.example/init', {})).toBe(
			'https://c.example/init'
		);
		expect(appendInitParams('', { version: '3.0.0' })).toBe(
			'?c15tVersion=3.0.0'
		);
	});

	it('round-trips through the header names a backend reads', () => {
		const url = appendInitParams('https://c.example/init', {
			country: 'DE',
			experiment: { arm: 'a=b', id: 'banner shape' },
			gpc: true,
			policyContract: 1,
			region: 'BE',
			version: '3.0.0',
		});
		const headers = applyInitParamsToHeaders(url, new Headers());
		expect(Object.fromEntries(headers)).toEqual({
			'x-c15t-country': 'DE',
			'x-c15t-experiment': 'banner%20shape=a%3Db',
			'x-c15t-gpc': '1',
			'x-c15t-policy-contract': '1',
			'x-c15t-region': 'BE',
			'x-c15t-version': '3.0.0',
		});
		expect(
			parseExperimentHeader(headers.get(CONSENT_EXPERIMENT_HEADER))
		).toEqual({ arm: 'a=b', id: 'banner shape' });
	});

	it('lets a parameter win over the legacy header and keeps the other headers', () => {
		const headers = applyInitParamsToHeaders(
			'/init?c15tCountry=FR&c15tPolicyContract=2',
			new Headers({
				'cf-ipcountry': 'US',
				'x-c15t-country': 'DE',
				'x-c15t-policy-contract': '1',
			})
		);
		expect(headers.get('x-c15t-country')).toBe('FR');
		expect(headers.get('x-c15t-policy-contract')).toBe('2');
		expect(headers.get('cf-ipcountry')).toBe('US');
	});

	it('falls back to the legacy headers when no parameter is sent', () => {
		const original = new Headers({
			'x-c15t-gpc': '1',
			'x-c15t-version': '2.0.0',
		});
		const headers = applyInitParamsToHeaders(
			new URL('https://c.example/init'),
			original
		);
		expect(Object.fromEntries(headers)).toEqual(Object.fromEntries(original));
		expect(headers).not.toBe(original);
	});

	it('ignores empty values and a GPC value other than 1 or 0', () => {
		const headers = applyInitParamsToHeaders(
			'/init?c15tCountry=&c15tGpc=yes',
			new Headers({ 'sec-gpc': '1' })
		);
		expect(headers.has('x-c15t-country')).toBe(false);
		// A malformed override must not hide the browser's own signal.
		expect(headers.has('x-c15t-gpc')).toBe(false);
	});
});
