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
import { googleTagManager } from './vendors/tag-managers/google-tag-manager';

describe('googleTagManager contract', () => {
	registerVendorContractCleanup();

	it('acknowledges the consent default before container boot', () => {
		installHeadProbe((node, win) => {
			if (!node.src.includes('googletagmanager.com/gtm.js')) {
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
					...googleTagManager({ id: 'GTM-CONTRACT' }),
					id: 'google-tag-manager-contract',
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
	});

	it('requests gtm.js before a choice by default', () => {
		const requests: string[] = [];
		installHeadProbe((node) => {
			requests.push(node.src);
		});

		loadScripts([googleTagManager({ id: 'GTM-DEFAULT' })], deniedConsents);

		expect(requests).toEqual([
			'https://www.googletagmanager.com/gtm.js?id=GTM-DEFAULT',
		]);
	});
});

describe('googleTagManager loadMode after-consent', () => {
	registerVendorContractCleanup();

	const toQueueEntry = function toQueueEntry(entry: unknown): unknown {
		return isArgumentsPayload(entry) ? toArgs(entry) : entry;
	};

	const recordGoogleRequests = function recordGoogleRequests() {
		const requests: { src: string; queue: unknown[] }[] = [];
		installHeadProbe((node, win) => {
			if (node.src.includes('googletagmanager.com')) {
				requests.push({
					queue: (win.dataLayer ?? []).map((entry) => toQueueEntry(entry)),
					src: node.src,
				});
			}
		});
		return requests;
	};

	it('makes no request to Google and creates no globals before consent', () => {
		const requests = recordGoogleRequests();
		const scripts = [
			googleTagManager({ id: 'GTM-GATED', loadMode: 'after-consent' }),
		];

		loadScripts(scripts, deniedConsents);
		updateScripts(scripts, { ...deniedConsents, functionality: true });

		const win = window as TestWindow;
		expect(requests).toEqual([]);
		expect(win.dataLayer).toBeUndefined();
		expect(win.gtag).toBeUndefined();
	});

	it('loads once after consent, with the consent default before the container starts', () => {
		const requests = recordGoogleRequests();
		const scripts = [
			googleTagManager({ id: 'GTM-GATED', loadMode: 'after-consent' }),
		];

		loadScripts(scripts, deniedConsents);
		updateScripts(scripts, grantedMarketingConsents);
		updateScripts(scripts, {
			...grantedMarketingConsents,
			measurement: true,
		});

		expect(requests).toHaveLength(1);
		const [request] = requests;
		expect(request?.src).toBe(
			'https://www.googletagmanager.com/gtm.js?id=GTM-GATED'
		);
		expect(request?.queue[0]).toEqual([
			'consent',
			'default',
			{
				ad_personalization: 'granted',
				ad_storage: 'granted',
				ad_user_data: 'granted',
				analytics_storage: 'denied',
				functionality_storage: 'denied',
				personalization_storage: 'denied',
				security_storage: 'granted',
			},
		]);
		expect(request?.queue[1]).toMatchObject({ event: 'gtm.js' });

		const win = window as TestWindow;
		const latest = (win.dataLayer ?? []).slice(-2).map(toQueueEntry);
		expect(latest).toEqual([
			[
				'consent',
				'update',
				expect.objectContaining({
					ad_storage: 'granted',
					analytics_storage: 'granted',
				}),
			],
			['event', 'consent-update'],
		]);
	});

	it('waits for the category option when one is set', () => {
		const requests = recordGoogleRequests();
		const scripts = [
			googleTagManager({
				category: 'measurement',
				id: 'GTM-ANALYTICS',
				loadMode: 'after-consent',
			}),
		];

		loadScripts(scripts, grantedMarketingConsents);
		expect(requests).toEqual([]);

		updateScripts(scripts, grantedMeasurementConsents);
		expect(requests).toHaveLength(1);
	});

	it('keeps the container after withdrawal and denies it', () => {
		const requests = recordGoogleRequests();
		const scripts = [
			googleTagManager({ id: 'GTM-GATED', loadMode: 'after-consent' }),
		];

		loadScripts(scripts, grantedMeasurementConsents);
		const element = document.head.querySelector('script');
		updateScripts(scripts, deniedConsents);

		const win = window as TestWindow;
		expect(element?.isConnected).toBe(true);
		expect((win.dataLayer ?? []).slice(-2).map(toQueueEntry)).toEqual([
			[
				'consent',
				'update',
				expect.objectContaining({ analytics_storage: 'denied' }),
			],
			['event', 'consent-update'],
		]);

		updateScripts(scripts, grantedMeasurementConsents);
		expect(requests).toHaveLength(1);
	});
});
