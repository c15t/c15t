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
import { liveIntentTag } from './vendors/ads-and-pixels/liveintent';

describe('LiveIntent core loader consent contract', () => {
	registerVendorContractCleanup();
	afterEach(() => {
		for (const key of ['liQ', 'LI', 'lc2', 'liQHub', 'liQ_instances']) {
			Reflect.deleteProperty(window, key);
		}
	});
	it('creates no vendor globals, requests or storage before mapped consent', () => {
		const scripts = [liveIntentTag({ tagId: 'a-00xx' })];
		loadScripts(scripts, deniedConsents);
		updateScripts(scripts, grantedMeasurementConsents);
		expect(document.querySelector('script')).toBeNull();
		for (const key of ['liQ', 'LI', 'lc2', 'liQHub', 'liQ_instances']) {
			expect(key in window).toBe(false);
		}
		expect(document.cookie).toBe('');
		updateScripts(scripts, grantedMarketingConsents);
		const element = document.querySelector('script');
		expect(element?.src).toBe('https://b-code.liadm.com/a-00xx.min.js');
		element?.dispatchEvent(new Event('load'));
		updateScripts(scripts, grantedMarketingConsents);
		expect(document.querySelectorAll('script')).toHaveLength(1);
	});
	it('retains one loader across in-flight revoke and regrant', () => {
		const scripts = [liveIntentTag({ tagId: 'a-00xx' })];
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
