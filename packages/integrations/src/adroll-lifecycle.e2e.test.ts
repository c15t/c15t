/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	deniedConsents,
	grantedMarketingConsents,
	grantedMeasurementConsents,
	installHeadProbe,
	isArgumentsPayload,
	loadScripts,
	registerVendorContractCleanup,
	toArgs,
	updateScripts,
} from './e2e-test-utils';
import { adrollPixel } from './vendors/ads-and-pixels/adroll';

const account = { advertiserId: 'c15t-advertiser', pixelId: 'c15t-pixel' };
const vendorGlobals = [
	'adroll',
	'adroll_adv_id',
	'adroll_pix_id',
	'adroll_version',
	'__adroll_loaded',
];

const queuedCalls = function queuedCalls(): unknown[][] {
	const queue = window.adroll;
	if (!Array.isArray(queue)) {
		throw new Error('Expected the AdRoll bootstrap array');
	}
	return queue.map((entry) => {
		if (!Array.isArray(entry) || !isArgumentsPayload(entry[1])) {
			throw new Error('Expected [method, Arguments] from the official snippet');
		}
		expect(entry).toHaveLength(2);
		return [entry[0], toArgs(entry[1])];
	});
};

describe('AdRoll production core loader contract', () => {
	registerVendorContractCleanup();
	afterEach(() => {
		for (const key of vendorGlobals) {
			Reflect.deleteProperty(window, key);
		}
	});

	it('defers vendor globals, loader nodes and storage until marketing consent', () => {
		const append = vi.fn();
		installHeadProbe(append);
		const setItem = vi.spyOn(Storage.prototype, 'setItem');
		const getItem = vi.spyOn(Storage.prototype, 'getItem');
		const cookieWrite = vi.spyOn(document, 'cookie', 'set');
		const scripts = [adrollPixel(account)];

		expect(loadScripts(scripts, deniedConsents)).toEqual([]);
		expect(updateScripts(scripts, grantedMeasurementConsents).loaded).toEqual(
			[]
		);
		for (const key of vendorGlobals) {
			expect(key in window).toBe(false);
		}
		expect(append).not.toHaveBeenCalled();
		expect(document.querySelector('script, img, iframe, link')).toBeNull();
		expect(setItem).not.toHaveBeenCalled();
		expect(getItem).not.toHaveBeenCalled();
		expect(cookieWrite).not.toHaveBeenCalled();

		expect(updateScripts(scripts, grantedMarketingConsents).loaded).toEqual([
			'adroll',
		]);
		expect(append).toHaveBeenCalledOnce();
		expect(document.querySelector('script')?.src).toBe(
			'https://s.adroll.com/j/c15t-advertiser/roundtrip.js'
		);
	});

	it('queues the exact official method and Arguments tuples before insertion', () => {
		let atAppend: unknown[][] | undefined;
		installHeadProbe((node) => {
			atAppend = queuedCalls();
			expect(window.adroll_adv_id).toBe('advertiser');
			expect(window.adroll_pix_id).toBe('pixel');
			expect(window.adroll_version).toBe('2.0');
			expect(window.__adroll_loaded).toBe(true);
			expect(window.adroll?.f).toEqual(['setProperties', 'identify', 'track']);
			expect(node.async).toBe(true);
		});
		loadScripts(
			[adrollPixel({ advertiserId: ' advertiser ', pixelId: ' pixel ' })],
			grantedMarketingConsents
		);
		expect(atAppend).toEqual([['track', ['pageView']]]);
		const properties = { currency: 'USD' };
		const purchase = { conversion_value: 12.5, currency: 'USD' };
		window.adroll?.setProperties?.(properties);
		window.adroll?.identify?.('customer-1', { plan: 'pro' });
		window.adroll?.track?.('purchase', purchase);
		expect(queuedCalls()).toEqual([
			['track', ['pageView']],
			['setProperties', [properties]],
			['identify', ['customer-1', { plan: 'pro' }]],
			['track', ['purchase', purchase]],
		]);
		const purchaseEntry = window.adroll?.[3];
		if (
			!Array.isArray(purchaseEntry) ||
			!isArgumentsPayload(purchaseEntry[1])
		) {
			throw new Error('Expected the queued purchase Arguments');
		}
		expect(purchaseEntry[1][1]).toBe(purchase);
	});

	it.each(['before revoke', 'after revoke'])(
		'does not repeat bootstrap on regrant when load completes %s',
		(completion) => {
			const append = vi.fn();
			installHeadProbe(append);
			const scripts = [adrollPixel(account)];
			loadScripts(scripts, grantedMarketingConsents);
			const element = document.querySelector('script');
			expect(element).not.toBeNull();
			const queue = window.adroll;
			if (completion === 'before revoke') {
				element?.dispatchEvent(new Event('load'));
			}
			updateScripts(scripts, deniedConsents);
			expect(element?.isConnected).toBe(true);
			expect(window.adroll).toBe(queue);
			expect(queuedCalls()).toEqual([['track', ['pageView']]]);
			if (completion === 'after revoke') {
				element?.dispatchEvent(new Event('load'));
			}
			const recreated = [adrollPixel(account)];
			updateScripts(recreated, grantedMarketingConsents);
			loadScripts(recreated, grantedMarketingConsents);
			expect(document.querySelector('script')).toBe(element);
			expect(append).toHaveBeenCalledOnce();
			expect(window.adroll).toBe(queue);
			expect(queuedCalls()).toEqual([['track', ['pageView']]]);
		}
	);

	it('preserves installed SDK methods and sends no invented withdrawal command', () => {
		const track = vi.fn();
		const identify = vi.fn();
		const setProperties = vi.fn();
		const existing = Object.assign([], { identify, setProperties, track });
		window.adroll = existing;
		const scripts = [adrollPixel(account)];
		loadScripts(scripts, deniedConsents);
		expect(track).not.toHaveBeenCalled();
		updateScripts(scripts, grantedMarketingConsents);
		expect(window.adroll).toBe(existing);
		expect(window.adroll?.track).toBe(track);
		expect(window.adroll?.identify).toBe(identify);
		expect(window.adroll?.setProperties).toBe(setProperties);
		expect(track).toHaveBeenCalledExactlyOnceWith('pageView');
		updateScripts(scripts, deniedConsents);
		updateScripts(scripts, grantedMarketingConsents);
		expect(track).toHaveBeenCalledExactlyOnceWith('pageView');
		expect(identify).not.toHaveBeenCalled();
		expect(setProperties).not.toHaveBeenCalled();
	});

	it('keeps a vendor replacement object through late load, revoke and regrant', () => {
		const scripts = [adrollPixel(account)];
		loadScripts(scripts, grantedMarketingConsents);
		const element = document.querySelector('script');
		const runtime = {
			get_cookie: vi.fn(),
			identify: vi.fn(),
			setProperties: vi.fn(),
			track: vi.fn(),
		};
		Reflect.set(window, 'adroll', runtime);
		updateScripts(scripts, deniedConsents);
		element?.dispatchEvent(new Event('load'));
		updateScripts([adrollPixel(account)], grantedMarketingConsents);
		expect(window.adroll).toBe(runtime);
		expect(document.querySelector('script')).toBe(element);
		expect(runtime.track).not.toHaveBeenCalled();
		expect(runtime.identify).not.toHaveBeenCalled();
		expect(runtime.setProperties).not.toHaveBeenCalled();
		expect(runtime.get_cookie).not.toHaveBeenCalled();
	});
});
