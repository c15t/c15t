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
import { rb2b } from './vendors/analytics/rb2b';

describe('RB2B core loader consent contract', () => {
	registerVendorContractCleanup();
	afterEach(() => {
		for (const key of ['reb2b']) {
			Reflect.deleteProperty(window, key);
		}
	});
	it('creates no vendor globals, requests or storage before mapped consent', () => {
		const scripts = [rb2b({ accountKey: 'c15tfake' })];
		loadScripts(scripts, deniedConsents);
		updateScripts(scripts, grantedMeasurementConsents);
		expect(document.querySelector('script')).toBeNull();
		for (const key of ['reb2b']) {
			expect(key in window).toBe(false);
		}
		expect(document.cookie).toBe('');
		updateScripts(scripts, grantedMarketingConsents);
		const element = document.querySelector('script');
		expect(element?.src).toBe(
			'https://ddwl4m2hdecbv.cloudfront.net/b/c15tfake/c15tfake.js.gz'
		);
		element?.dispatchEvent(new Event('load'));
		updateScripts(scripts, grantedMarketingConsents);
		expect(document.querySelectorAll('script')).toHaveLength(1);
	});
	it('retains one loader across in-flight revoke and regrant', () => {
		const scripts = [rb2b({ accountKey: 'c15tfake' })];
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

describe('RB2B official bootstrap', () => {
	registerVendorContractCleanup();
	afterEach(() => Reflect.deleteProperty(window, 'reb2b'));
	it('keeps the snippet guard and tuple methods behind consent', () => {
		const scripts = [rb2b({ accountKey: 'c15tfake' })];
		loadScripts(scripts, grantedMarketingConsents);
		expect(window.reb2b?.invoked).toBe(true);
		expect(window.reb2b?.SNIPPET_VERSION).toBe('1.0.1');
		window.reb2b?.identify?.('known');
		window.reb2b?.collect?.();
		expect(window.reb2b?.slice()).toEqual([['identify', 'known'], ['collect']]);
		const client = window.reb2b;
		updateScripts(scripts, deniedConsents);
		updateScripts(scripts, grantedMarketingConsents);
		expect(window.reb2b).toBe(client);
	});
});
