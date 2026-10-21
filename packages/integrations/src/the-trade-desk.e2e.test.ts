/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from 'vitest';

import {
	deniedConsents,
	grantedMarketingConsents,
	grantedMeasurementConsents,
	loadScripts,
	updateScripts,
	registerVendorContractCleanup,
} from './e2e-test-utils';
import { theTradeDeskPixel } from './vendors/ads-and-pixels/the-trade-desk';

describe('The Trade Desk core loader consent contract', () => {
	registerVendorContractCleanup();
	afterEach(() => {
		for (const key of ['TTDConversionEvents', 'TTDUniversalPixelApi']) {
			Reflect.deleteProperty(window, key);
		}
	});
	it('creates no vendor globals, requests or storage before mapped consent', () => {
		const scripts = [
			theTradeDeskPixel({ advertiserId: 'c15tfake', pixelIds: ['c15tfake'] }),
		];
		loadScripts(scripts, deniedConsents);
		updateScripts(scripts, grantedMeasurementConsents);
		expect(document.querySelector('script')).toBeNull();
		for (const key of [
			'ttdConversionEvents',
			'ttdConversionEventsLayer',
			'TTDConversionEvents',
			'TTDUniversalPixelApi',
		]) {
			expect(key in window).toBe(false);
		}
		expect(document.cookie).toBe('');
		updateScripts(scripts, grantedMarketingConsents);
		const element = document.querySelector('script');
		expect(element?.src).toBe('https://js.adsrvr.org/up_loader.3.0.0.js');
		element?.dispatchEvent(new Event('load'));
		updateScripts(scripts, grantedMarketingConsents);
		expect(document.querySelectorAll('script')).toHaveLength(1);
	});
	it('retains one loader across in-flight revoke and regrant', () => {
		const scripts = [
			theTradeDeskPixel({ advertiserId: 'c15tfake', pixelIds: ['c15tfake'] }),
		];
		loadScripts(scripts, grantedMarketingConsents);
		const old = document.querySelector('script');
		updateScripts(scripts, deniedConsents);
		expect(old?.isConnected).toBe(true);
		old?.dispatchEvent(new Event('load'));
		expect(document.querySelector('script')).toBe(old);
		updateScripts(scripts, grantedMarketingConsents);
		const current = document.querySelector('script');
		expect(current).toBe(old);
		current?.dispatchEvent(new Event('load'));
		updateScripts(scripts, grantedMarketingConsents);
		expect(document.querySelectorAll('script')).toHaveLength(1);
	});
});

describe('Trade Desk SDK queue contract', () => {
	registerVendorContractCleanup();
	it('queues init and event with processing policy before loading', () => {
		const scripts = [
			theTradeDeskPixel({
				advertiserId: ' adv ',
				dataProcessingOption: { policies: ['LDU'], region: 'US-CO' },
				enableCookieSyncing: false,
				pixelIds: [' pixel '],
			}),
		];
		loadScripts(scripts, grantedMarketingConsents);
		const queue = window.ttdConversionEventsLayer?.map((value) =>
			Array.from(value as ArrayLike<unknown>)
		);
		expect(queue).toEqual([
			[
				'init',
				{
					advertiserId: 'adv',
					dataProcessingOption: { policies: ['LDU'], region: 'US-CO' },
					enableCookieSyncing: false,
					pixelIds: ['pixel'],
				},
			],
			[
				'event',
				{
					advertiserId: 'adv',
					data_processing_option: { policies: ['LDU'], region: 'US-CO' },
					pixelIds: ['pixel'],
				},
			],
		]);
		updateScripts(scripts, deniedConsents);
		updateScripts(scripts, grantedMarketingConsents);
		expect(window.ttdConversionEventsLayer).toHaveLength(2);
	});
});
