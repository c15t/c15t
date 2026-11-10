/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from 'vitest';

import {
	deniedConsents,
	grantedMarketingConsents,
	grantedMeasurementConsents,
	installHeadProbe,
	loadScripts,
	registerVendorContractCleanup,
	updateScripts,
} from './e2e-test-utils';
import { notraAnalytics } from './vendors/analytics/notra-analytics';

const probeNotraScripts = function probeNotraScripts() {
	const scripts: HTMLScriptElement[] = [];
	installHeadProbe((node) => {
		if (node.src.includes('/notra.')) {
			scripts.push(node);
			node.dispatchEvent(new Event('load'));
		}
	});
	return scripts;
};

describe('notra analytics contract', () => {
	registerVendorContractCleanup();

	it('loads nothing until measurement consent is granted', () => {
		const loaded = probeNotraScripts();
		const script = notraAnalytics({ webKey: 'nwk.contract' });

		expect(loadScripts([script], deniedConsents)).toEqual([]);
		expect(updateScripts([script], grantedMarketingConsents).loaded).toEqual(
			[]
		);
		expect(loaded).toHaveLength(0);
		expect(document.querySelector('script')).toBeNull();
	});

	it('loads the pinned notra.js with integrity', () => {
		const loaded = probeNotraScripts();

		loadScripts(
			[notraAnalytics({ webKey: 'nwk.contract' })],
			grantedMeasurementConsents
		);

		expect(
			loaded.map((node) => ({
				api: node.dataset.api,
				crossorigin: node.getAttribute('crossorigin'),
				hash: node.hasAttribute('data-hash'),
				integrity: node.getAttribute('integrity'),
				key: node.dataset.key,
				src: node.src,
			}))
		).toEqual([
			{
				api: 'https://ingest.usenotra.com/api/collect',
				crossorigin: 'anonymous',
				hash: false,
				integrity:
					'sha384-LuUp5Hj+rSQ4/mZp1sWBOrJDHIHKGqflwF1GYIreqmWdCaI1otOQealWJGRj6Toj',
				key: 'nwk.contract',
				src: 'https://static.usenotra.com/notra.ce3c872ef9c9.js',
			},
		]);
	});

	it('loads the pinned notra.plus.js with integrity and hash routing', () => {
		const loaded = probeNotraScripts();

		loadScripts(
			[notraAnalytics({ errors: true, hash: true, webKey: 'nwk.contract' })],
			grantedMeasurementConsents
		);

		expect(loaded[0]?.src).toBe(
			'https://static.usenotra.com/notra.plus.d703b9cc5508.js'
		);
		expect(loaded[0]?.getAttribute('integrity')).toBe(
			'sha384-MgLdHKufD0WdkO4pxtkT/bbNCKxl6PxOyUJe+M/qwFGfjOdZ5rEnljxTlOVQIzF+'
		);
		expect(loaded[0]?.hasAttribute('data-hash')).toBe(true);
	});

	it('loads a custom script URL without integrity', () => {
		const loaded = probeNotraScripts();

		loadScripts(
			[
				notraAnalytics({
					scriptUrl: 'https://cdn.example.com/notra.js',
					webKey: 'nwk.contract',
				}),
			],
			grantedMeasurementConsents
		);

		expect(loaded[0]?.src).toBe('https://cdn.example.com/notra.js');
		expect(loaded[0]?.hasAttribute('integrity')).toBe(false);
		expect(loaded[0]?.hasAttribute('crossorigin')).toBe(false);
	});

	it('loads on grant, removes the script on refusal and loads again on a later grant', () => {
		const loaded = probeNotraScripts();
		const scripts = [notraAnalytics({ webKey: 'nwk.contract' })];

		expect(loadScripts(scripts, grantedMeasurementConsents)).toEqual([
			'notra-analytics',
		]);
		expect(updateScripts(scripts, grantedMeasurementConsents).loaded).toEqual(
			[]
		);
		expect(updateScripts(scripts, deniedConsents).unloaded).toEqual([
			'notra-analytics',
		]);
		expect(document.querySelector('script')).toBeNull();
		expect(updateScripts(scripts, grantedMeasurementConsents).loaded).toEqual([
			'notra-analytics',
		]);

		expect(loaded).toHaveLength(2);
		expect(loaded[0]?.isConnected).toBe(false);
		expect(loaded[0]?.dataset.key).toBe('nwk.contract');
		expect(loaded[1]?.isConnected).toBe(true);
		expect(loaded[1]?.dataset.key).toBe('nwk.contract');
	});

	it('removes the web key when consent is refused while notra.js downloads', () => {
		const scripts = [notraAnalytics({ webKey: 'nwk.contract' })];
		loadScripts(scripts, grantedMeasurementConsents);
		const element = document.querySelector('script');
		expect(element?.dataset.key).toBe('nwk.contract');

		updateScripts(scripts, deniedConsents);

		expect(element?.isConnected).toBe(false);
		expect(element?.hasAttribute('data-key')).toBe(false);
	});
});
