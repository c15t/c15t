/**
 * @vitest-environment jsdom
 */
import { createConsentKernel } from '@c15t/core';
import { createScriptLoader } from '@c15t/core/modules/script-loader';
import { afterEach, describe, expect, it, vi } from 'vitest';

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
	it('preserves a frozen runtime client when a changed source remounts', () => {
		const kernel = createConsentKernel();
		void kernel.commands.save(grantedMarketingConsents);
		const debug = vi.fn();
		const loader = createScriptLoader({
			kernel,
			onDebug: debug,
			scripts: [rb2b({ accountKey: 'c15tfake' })],
		});
		try {
			const original = document.querySelector('script');
			original?.dispatchEvent(new Event('load'));
			const client = Object.freeze({ collect: vi.fn(), identify: vi.fn() });
			Object.defineProperty(window, 'reb2b', {
				configurable: true,
				value: client,
				writable: true,
			});
			debug.mockClear();
			loader.updateScripts([rb2b({ accountKey: 'anotherfake' })]);
			expect(document.querySelector('script')).not.toBe(original);
			expect(document.querySelector('script')?.src).toBe(
				'https://ddwl4m2hdecbv.cloudfront.net/b/anotherfake/anotherfake.js.gz'
			);
			expect(window.reb2b).toBe(client);
			expect(debug).not.toHaveBeenCalledWith(
				expect.objectContaining({ action: 'callback_error' })
			);
		} finally {
			loader.dispose();
			kernel.dispose();
		}
	});
});

describe('RB2B shared cleanup', () => {
	afterEach(() => {
		expect('reb2b' in window).toBe(false);
	});
	describe('after bootstrap', () => {
		registerVendorContractCleanup();
		it('clears bootstrapped globals with shared vendor cleanup', () => {
			loadScripts([rb2b({ accountKey: 'c15tfake' })], grantedMarketingConsents);
			expect(window.reb2b?.invoked).toBe(true);
		});
	});
});
