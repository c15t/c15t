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
import { adrollPixel } from './vendors/ads-and-pixels/adroll';

describe('AdRoll core loader consent contract', () => {
	registerVendorContractCleanup();
	afterEach(() => {
		for (const key of [
			'adroll',
			'adroll_adv_id',
			'adroll_pix_id',
			'adroll_version',
			'__adroll_loaded',
			'__adroll',
		]) {
			Reflect.deleteProperty(window, key);
		}
	});
	it('creates no vendor globals, requests or storage before mapped consent', () => {
		const scripts = [
			adrollPixel({ advertiserId: 'c15tfake', pixelId: 'c15tfake' }),
		];
		loadScripts(scripts, deniedConsents);
		updateScripts(scripts, grantedMeasurementConsents);
		expect(document.querySelector('script')).toBeNull();
		for (const key of [
			'adroll',
			'adroll_adv_id',
			'adroll_pix_id',
			'adroll_version',
			'__adroll_loaded',
			'__adroll',
		]) {
			expect(key in window).toBe(false);
		}
		expect(document.cookie).toBe('');
		updateScripts(scripts, grantedMarketingConsents);
		const element = document.querySelector('script');
		expect(element?.src).toBe('https://s.adroll.com/j/c15tfake/roundtrip.js');
		element?.dispatchEvent(new Event('load'));
		updateScripts(scripts, grantedMarketingConsents);
		expect(document.querySelectorAll('script')).toHaveLength(1);
	});
	it('retains one loader across in-flight revoke and regrant', () => {
		const scripts = [
			adrollPixel({ advertiserId: 'c15tfake', pixelId: 'c15tfake' }),
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
