/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from 'vitest';
import {
	deniedConsents,
	installHeadProbe,
	isArgumentsPayload,
	loadScripts,
	registerVendorContractCleanup,
	type TestWindow,
	toArgs,
} from './e2e-test-utils';
import { gtag } from './google-tag';

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
					...gtag({ id: 'G-CONTRACT', category: 'measurement' }),
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
				security_storage: 'granted',
				functionality_storage: 'denied',
				analytics_storage: 'denied',
				ad_storage: 'denied',
				ad_user_data: 'denied',
				ad_personalization: 'denied',
				personalization_storage: 'denied',
			},
		]);
		const jsEntry = toArgs(win.dataLayer?.[1]);
		expect(jsEntry[0]).toBe('js');
		expect(typeof jsEntry[1] === 'number' || jsEntry[1] instanceof Date).toBe(
			true
		);
		expect(toArgs(win.dataLayer?.[2])).toEqual(['config', 'G-CONTRACT']);
	});
});
