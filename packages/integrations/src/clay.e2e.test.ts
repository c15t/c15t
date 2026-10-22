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
import { clay } from './vendors/analytics/clay';

describe('Clay core loader consent contract', () => {
	registerVendorContractCleanup();
	afterEach(() => {
		for (const key of ['Claydar', '__RADAR_TRACKERS__']) {
			Reflect.deleteProperty(window, key);
		}
	});
	it('creates no vendor globals, requests or storage before mapped consent', () => {
		const scripts = [clay({ siteId: 'c15tfake' })];
		loadScripts(scripts, deniedConsents);
		updateScripts(scripts, grantedMeasurementConsents);
		expect(document.querySelector('script')).toBeNull();
		for (const key of ['Claydar', '__RADAR_TRACKERS__']) {
			expect(key in window).toBe(false);
		}
		expect(document.cookie).toBe('');
		updateScripts(scripts, grantedMarketingConsents);
		const element = document.querySelector('script');
		expect(element?.src).toBe(
			'https://static.claydar.com/init.v1.js?id=c15tfake'
		);
		element?.dispatchEvent(new Event('load'));
		updateScripts(scripts, grantedMarketingConsents);
		expect(document.querySelectorAll('script')).toHaveLength(1);
	});
	it('retains one loader across in-flight revoke and regrant', () => {
		const scripts = [clay({ siteId: 'c15tfake' })];
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

describe('Clay consent forwarding', () => {
	registerVendorContractCleanup();
	afterEach(() => {
		Reflect.deleteProperty(window, 'Claydar');
	});
	it('queues the initial grant and invokes the live consent methods on transitions', () => {
		const base = clay({ siteId: 'c15tfake' });
		const infos: unknown[] = [];
		const scripts = [
			{
				...base,
				onLoad(info: Parameters<NonNullable<typeof base.onLoad>>[0]) {
					infos.push({
						connected: info.element?.isConnected,
						consent: info.hasConsent,
					});
					base.onLoad?.(info);
				},
			},
		];
		loadScripts(scripts, grantedMarketingConsents);
		const queue: unknown[] = [];
		Reflect.set(window, 'Claydar', queue);
		document.querySelector('script')?.dispatchEvent(new Event('load'));
		expect(infos).toEqual([{ connected: true, consent: true }]);
		expect(queue).toEqual([['giveCookieConsent']]);
		let grants = 0;
		let denials = 0;
		Reflect.set(window, 'Claydar', {
			denyCookieConsent() {
				denials += 1;
			},
			giveCookieConsent() {
				grants += 1;
			},
		});
		updateScripts(scripts, deniedConsents);
		expect(denials).toBe(1);
		updateScripts(scripts, grantedMarketingConsents);
		expect(grants).toBe(1);
	});
	it('does not grant a loader that finishes after revocation', () => {
		const scripts = [clay({ siteId: 'c15tfake' })];
		loadScripts(scripts, grantedMarketingConsents);
		updateScripts(scripts, deniedConsents);
		const queue: unknown[] = [];
		Reflect.set(window, 'Claydar', queue);
		document.querySelector('script')?.dispatchEvent(new Event('load'));
		expect(queue).toEqual([['denyCookieConsent']]);
	});
});

describe('Clay pending tracker consent', () => {
	registerVendorContractCleanup();
	afterEach(() => Reflect.deleteProperty(window, 'Claydar'));
	it('queues withdrawal after the first stage while the tracker is pending', () => {
		const scripts = [clay({ siteId: 'c15tfake' })];
		loadScripts(scripts, grantedMarketingConsents);
		const queue: unknown[] = [];
		Reflect.set(window, 'Claydar', queue);
		document.querySelector('script')?.dispatchEvent(new Event('load'));
		updateScripts(scripts, deniedConsents);
		expect(queue).toEqual([['giveCookieConsent'], ['denyCookieConsent']]);
		updateScripts(scripts, grantedMarketingConsents);
		expect(queue).toEqual([
			['giveCookieConsent'],
			['denyCookieConsent'],
			['giveCookieConsent'],
		]);
	});
});
