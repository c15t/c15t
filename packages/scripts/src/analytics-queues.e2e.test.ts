/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from 'vitest';
import {
	grantedMeasurementConsents,
	installHeadProbe,
	loadScripts,
	registerVendorContractCleanup,
	type TestWindow,
} from './e2e-test-utils';
import { hotjar } from './vendors/analytics/hotjar';
import { matomoAnalytics } from './vendors/analytics/matomo-analytics';
import { mixpanelAnalytics } from './vendors/analytics/mixpanel-analytics';
import { vercelAnalytics } from './vendors/analytics/vercel-analytics';

describe('analytics queue contracts', () => {
	registerVendorContractCleanup();

	it('boots Hotjar settings and queue before append', () => {
		let queueSnapshot: unknown[][] | undefined;
		let settingsSnapshot: TestWindow['_hjSettings'];
		let scriptSrc: string | undefined;

		installHeadProbe((node, win) => {
			if (!node.src.includes('static.hotjar.com/c/hotjar-123456.js')) {
				return;
			}

			win.hj?.('event', 'Signup');
			queueSnapshot = win.hj?.q?.map((entry) => [...entry]);
			settingsSnapshot = win._hjSettings;
			scriptSrc = node.src;
			node.dispatchEvent(new Event('load'));
		});

		loadScripts(
			[
				{
					...hotjar({ siteId: 123456, version: 7 }),
					id: 'hotjar-contract',
				},
			],
			grantedMeasurementConsents
		);

		expect(scriptSrc).toContain('/hotjar-123456.js?sv=7');
		expect(settingsSnapshot).toEqual({
			hjid: '123456',
			hjsv: 7,
		});
		expect(queueSnapshot).toEqual([['event', 'Signup']]);
	});

	it('queues Matomo setup and consent commands before append', () => {
		let queueSnapshot: unknown[] | undefined;
		let scriptSrc: string | undefined;

		installHeadProbe((node, win) => {
			if (!node.src.includes('analytics.example.com/matomo.js')) {
				return;
			}

			scriptSrc = node.src;
			queueSnapshot = win._paq?.map((entry) =>
				Array.isArray(entry) ? [...entry] : entry
			);
			node.dispatchEvent(new Event('load'));
		});

		loadScripts(
			[
				{
					...matomoAnalytics({
						defaultConsent: 'required',
						disableCookies: true,
						enableLinkTracking: true,
						matomoUrl: 'https://analytics.example.com',
						siteId: 42,
					}),
					id: 'matomo-analytics-contract',
				},
			],
			grantedMeasurementConsents
		);

		expect(scriptSrc).toContain('/matomo.js');
		expect(queueSnapshot).toEqual([
			['setTrackerUrl', 'https://analytics.example.com/matomo.php'],
			['setSiteId', '42'],
			['enableLinkTracking'],
			['disableCookies'],
			['requireConsent'],
			['setConsentGiven'],
			['trackPageView'],
		]);
	});

	it('boots Mixpanel queue methods and load-time consent handoff', () => {
		const initCalls: unknown[][] = [];
		let methodTypes: Record<string, string> | undefined;
		let queueBeforeLoad: unknown[] | undefined;
		let queueAfterLoad: unknown[] | undefined;

		installHeadProbe((node, win) => {
			if (!node.src.includes('cdn.mxpnl.com/libs/mixpanel-2-latest.min.js')) {
				return;
			}

			const mixpanel = win.mixpanel;
			methodTypes = {
				identify: typeof mixpanel?.identify,
				init: typeof mixpanel?.init,
				optIn: typeof mixpanel?.opt_in_tracking,
				optOut: typeof mixpanel?.opt_out_tracking,
				register: typeof mixpanel?.register,
				reset: typeof mixpanel?.reset,
				track: typeof mixpanel?.track,
			};

			mixpanel?.track?.('Signup', { plan: 'pro' });
			queueBeforeLoad = Array.from(mixpanel ?? []);
			if (mixpanel) {
				mixpanel.init = (...args: unknown[]) => {
					initCalls.push(args);
				};
			}
			node.dispatchEvent(new Event('load'));
			queueAfterLoad = Array.from(mixpanel ?? []);
		});

		loadScripts(
			[
				{
					...mixpanelAnalytics({
						initOptions: { debug: true },
						token: '1234567890abcdef1234567890abcdef',
					}),
					id: 'mixpanel-analytics-contract',
				},
			],
			grantedMeasurementConsents
		);

		expect(methodTypes).toEqual({
			identify: 'function',
			init: 'undefined',
			optIn: 'function',
			optOut: 'function',
			register: 'function',
			reset: 'function',
			track: 'function',
		});
		expect(queueBeforeLoad).toEqual([['track', 'Signup', { plan: 'pro' }]]);
		expect(initCalls).toEqual([
			['1234567890abcdef1234567890abcdef', { debug: true }],
		]);
		expect(queueAfterLoad).toEqual([
			['track', 'Signup', { plan: 'pro' }],
			['opt_in_tracking'],
		]);
	});

	it('boots Vercel Analytics queue and loader attributes before append', () => {
		let attributes: Record<string, string | boolean | null> | undefined;
		let queueSnapshot: unknown[] | undefined;

		installHeadProbe((node, win) => {
			if (!node.src.includes('va.vercel-scripts.com/v1/script.debug.js')) {
				return;
			}

			win.va?.('Signup', { plan: 'pro' });
			attributes = {
				dataDisableAutoTrack: node.getAttribute('data-disable-auto-track'),
				dataDsn: node.getAttribute('data-dsn'),
				dataEndpoint: node.getAttribute('data-endpoint'),
				dataSdkn: node.getAttribute('data-sdkn'),
				defer: node.defer,
			};
			queueSnapshot = win.vaq?.map((entry) => [...entry]);
			node.dispatchEvent(new Event('load'));
		});

		loadScripts(
			[
				{
					...vercelAnalytics({
						debug: true,
						disableAutoTrack: true,
						dsn: 'VERCEL-CONTRACT',
						endpoint: '/analytics',
					}),
					id: 'vercel-analytics-contract',
				},
			],
			grantedMeasurementConsents
		);

		expect(attributes).toEqual({
			dataDisableAutoTrack: '1',
			dataDsn: 'VERCEL-CONTRACT',
			dataEndpoint: '/analytics',
			dataSdkn: 'c15t',
			defer: true,
		});
		expect(queueSnapshot).toEqual([['Signup', { plan: 'pro' }]]);
	});
});
