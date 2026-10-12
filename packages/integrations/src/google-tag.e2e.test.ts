/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from 'vitest';

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
import type { TestWindow } from './e2e-test-utils';
import { gtag } from './vendors/analytics/google-tag';

describe('gtag contract', () => {
	registerVendorContractCleanup();

	it('acknowledges the consent default before config boot logic', () => {
		installHeadProbe((node, win) => {
			if (!node.src.includes('googletagmanager.com/gtag/js')) {
				return;
			}

			const firstEntry = win.dataLayer?.[0];
			const usesConsentDefault =
				isArgumentsPayload(firstEntry) &&
				toArgs(firstEntry)[0] === 'consent' &&
				toArgs(firstEntry)[1] === 'default' &&
				typeof toArgs(firstEntry)[2] === 'object';

			win.google_tag_data = {
				ics: {
					usedDefault: usesConsentDefault,
					usedImplicit: !usesConsentDefault,
				},
			};

			node.dispatchEvent(new Event('load'));
		});

		loadScripts(
			[
				{
					...gtag({ category: 'measurement', id: 'G-CONTRACT' }),
					id: 'gtag-contract',
				},
			],
			deniedConsents
		);

		const win = window as TestWindow;
		expect(Array.isArray(win.dataLayer?.[0])).toBe(false);
		expect(win.google_tag_data?.ics.usedDefault).toBe(true);
		expect(win.google_tag_data?.ics.usedImplicit).toBe(false);
		expect(toArgs(win.dataLayer?.[0])).toEqual([
			'consent',
			'default',
			{
				ad_personalization: 'denied',
				ad_storage: 'denied',
				ad_user_data: 'denied',
				analytics_storage: 'denied',
				functionality_storage: 'denied',
				personalization_storage: 'denied',
				security_storage: 'granted',
			},
		]);
		const jsEntry = toArgs(win.dataLayer?.[1]);
		expect(jsEntry[0]).toBe('js');
		expect(typeof jsEntry[1] === 'number' || jsEntry[1] instanceof Date).toBe(
			true
		);
		expect(toArgs(win.dataLayer?.[2])).toEqual(['config', 'G-CONTRACT']);
	});

	it('requests gtag.js before a choice by default', () => {
		const requests: string[] = [];
		installHeadProbe((node) => {
			requests.push(node.src);
		});

		loadScripts(
			[gtag({ category: 'measurement', id: 'G-DEFAULT' })],
			deniedConsents
		);

		expect(requests).toEqual([
			'https://www.googletagmanager.com/gtag/js?id=G-DEFAULT',
		]);
	});
});

describe('gtag loadMode after-consent', () => {
	registerVendorContractCleanup();

	const recordGoogleRequests = function recordGoogleRequests() {
		const requests: { src: string; queue: unknown[][] }[] = [];
		installHeadProbe((node, win) => {
			if (node.src.includes('googletagmanager.com')) {
				requests.push({
					queue: (win.dataLayer ?? []).map((entry) => toArgs(entry)),
					src: node.src,
				});
			}
		});
		return requests;
	};

	it('makes no request to Google and creates no globals before consent', () => {
		const requests = recordGoogleRequests();
		const scripts = [
			gtag({
				category: 'measurement',
				id: 'G-GATED',
				loadMode: 'after-consent',
			}),
		];

		loadScripts(scripts, deniedConsents);
		updateScripts(scripts, grantedMarketingConsents);

		const win = window as TestWindow;
		expect(requests).toEqual([]);
		expect(win.dataLayer).toBeUndefined();
		expect(win.gtag).toBeUndefined();
	});

	it('loads once after consent, with the consent default before config', () => {
		const requests = recordGoogleRequests();
		const scripts = [
			gtag({
				category: 'measurement',
				id: 'G-GATED',
				loadMode: 'after-consent',
			}),
		];

		loadScripts(scripts, deniedConsents);
		updateScripts(scripts, grantedMeasurementConsents);
		updateScripts(scripts, {
			...grantedMeasurementConsents,
			marketing: true,
		});

		expect(requests).toHaveLength(1);
		const [request] = requests;
		expect(request?.src).toBe(
			'https://www.googletagmanager.com/gtag/js?id=G-GATED'
		);
		expect(request?.queue[0]).toEqual([
			'consent',
			'default',
			{
				ad_personalization: 'denied',
				ad_storage: 'denied',
				ad_user_data: 'denied',
				analytics_storage: 'granted',
				functionality_storage: 'denied',
				personalization_storage: 'denied',
				security_storage: 'granted',
			},
		]);
		expect(request?.queue[1]?.[0]).toBe('js');
		expect(request?.queue[2]).toEqual(['config', 'G-GATED']);

		const win = window as TestWindow;
		expect(toArgs(win.dataLayer?.at(-1))).toEqual([
			'consent',
			'update',
			expect.objectContaining({
				ad_storage: 'granted',
				analytics_storage: 'granted',
			}),
		]);
	});

	it('keeps the tag after withdrawal, denies it, and reuses it on a new grant', () => {
		const requests = recordGoogleRequests();
		const scripts = [
			gtag({
				category: 'measurement',
				id: 'G-GATED',
				loadMode: 'after-consent',
			}),
		];

		loadScripts(scripts, grantedMeasurementConsents);
		const element = document.head.querySelector('script');
		updateScripts(scripts, deniedConsents);

		const win = window as TestWindow;
		expect(element?.isConnected).toBe(true);
		expect(toArgs(win.dataLayer?.at(-1))).toEqual([
			'consent',
			'update',
			expect.objectContaining({ analytics_storage: 'denied' }),
		]);

		updateScripts(scripts, grantedMeasurementConsents);

		expect(requests).toHaveLength(1);
		expect(toArgs(win.dataLayer?.at(-1))).toEqual([
			'consent',
			'update',
			expect.objectContaining({ analytics_storage: 'granted' }),
		]);
	});
});
