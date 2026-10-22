/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from 'vitest';

import {
	deniedConsents,
	grantedMeasurementConsents,
	loadScripts,
	updateScripts,
	registerVendorContractCleanup,
} from './e2e-test-utils';
import { defaultComPixel } from './vendors/analytics/default-com';

describe('Default core loader consent contract', () => {
	registerVendorContractCleanup();
	afterEach(() => {
		for (const key of ['__defaultPixel__', 'DefaultPixelSDK']) {
			Reflect.deleteProperty(window, key);
		}
	});
	it('creates no vendor globals, requests or storage before mapped consent', () => {
		const scripts = [defaultComPixel({ publicKey: 'c15tfake' })];
		loadScripts(scripts, deniedConsents);
		updateScripts(scripts, { ...deniedConsents, marketing: true });
		expect(document.querySelector('script')).toBeNull();
		for (const key of ['__defaultPixel__', 'DefaultPixelSDK']) {
			expect(key in window).toBe(false);
		}
		expect(document.cookie).toBe('');
		updateScripts(scripts, grantedMeasurementConsents);
		const element = document.querySelector('script');
		expect(element?.src).toBe('https://handshake.default.com/index.js');
		element?.dispatchEvent(new Event('load'));
		updateScripts(scripts, grantedMeasurementConsents);
		expect(document.querySelectorAll('script')).toHaveLength(1);
	});
	it('retains one loader across in-flight revoke and regrant', () => {
		const scripts = [defaultComPixel({ publicKey: 'c15tfake' })];
		loadScripts(scripts, grantedMeasurementConsents);
		const old = document.querySelector('script');
		updateScripts(scripts, deniedConsents);
		expect(old?.isConnected).toBe(true);
		old?.dispatchEvent(new Event('load'));
		expect(document.querySelector('script')).toBe(old);
		updateScripts(scripts, grantedMeasurementConsents);
		const current = document.querySelector('script');
		expect(current).toBe(old);
		current?.dispatchEvent(new Event('load'));
		updateScripts(scripts, grantedMeasurementConsents);
		expect(document.querySelectorAll('script')).toHaveLength(1);
	});
});
