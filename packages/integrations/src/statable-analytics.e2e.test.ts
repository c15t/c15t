/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	deniedConsents,
	grantedMarketingConsents,
	grantedMeasurementConsents,
	installHeadProbe,
	loadScripts,
	registerVendorContractCleanup,
	updateScripts,
} from './e2e-test-utils';
import { statableAnalytics } from './vendors/analytics/statable-analytics';

describe('Statable consent lifecycle', () => {
	registerVendorContractCleanup();
	beforeEach(() => {
		// Node 25+ replaces jsdom's storage globals with its own Web Storage.
		vi.stubGlobal('localStorage', jsdom.window.localStorage);
		vi.stubGlobal('sessionStorage', jsdom.window.sessionStorage);
	});
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('leaves scripts, event globals and storage untouched before measurement consent', () => {
		const script = statableAnalytics({ siteId: 12345 });
		const cookies = document.cookie;
		const localKeys = Object.keys(window.localStorage);
		const sessionKeys = Object.keys(window.sessionStorage);

		expect(loadScripts([script], deniedConsents)).toEqual([]);
		expect(updateScripts([script], grantedMarketingConsents).loaded).toEqual(
			[]
		);
		expect(document.querySelector('script')).toBeNull();
		expect(window.statable).toBeUndefined();
		expect(document.cookie).toBe(cookies);
		expect(Object.keys(window.localStorage)).toEqual(localKeys);
		expect(Object.keys(window.sessionStorage)).toEqual(sessionKeys);
	});

	it('loads once with attributes ready and leaves the real tracker to initialize its API', () => {
		const scripts = [
			statableAnalytics({
				siteId: 12345,
				trackingApi: 'https://analytics.example.com/api/event',
			}),
		];
		let appended = 0;
		installHeadProbe((element) => {
			appended += 1;
			expect(element.src).toBe('https://statable.com/js/12345/s.js');
			expect(element.defer).toBe(true);
			expect(element.dataset.id).toBe('12345');
			expect(element.dataset.trackingApi).toBe(
				'https://analytics.example.com/api/event'
			);
			expect(window.statable).toBeUndefined();
			element.dispatchEvent(new Event('load'));
		});

		expect(loadScripts(scripts, grantedMeasurementConsents)).toEqual([
			'statable-analytics',
		]);
		expect(updateScripts(scripts, grantedMeasurementConsents).loaded).toEqual(
			[]
		);
		expect(appended).toBe(1);
		expect(updateScripts(scripts, deniedConsents).unloaded).toEqual([
			'statable-analytics',
		]);
		expect(document.querySelector('script')).toBeNull();
		expect(updateScripts(scripts, grantedMeasurementConsents).loaded).toEqual([
			'statable-analytics',
		]);
		expect(document.querySelectorAll('script')).toHaveLength(1);
	});

	it('removes a downloading loader when measurement is revoked', () => {
		const scripts = [statableAnalytics({ siteId: 12345 })];
		loadScripts(scripts, grantedMeasurementConsents);
		const element = document.querySelector('script');
		updateScripts(scripts, deniedConsents);
		element?.dispatchEvent(new Event('load'));

		expect(element?.isConnected).toBe(false);
		expect(document.querySelector('script')).toBeNull();
		expect(window.statable).toBeUndefined();
	});
});
