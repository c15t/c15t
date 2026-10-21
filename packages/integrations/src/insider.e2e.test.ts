/**
 * @vitest-environment jsdom
 */

import { createConsentKernel } from '@c15t/core';
import { createScriptLoader } from '@c15t/core/modules/script-loader';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	clearAllScripts,
	deniedConsents,
	grantedMarketingConsents,
	grantedMeasurementConsents,
	installHeadProbe,
	loadScripts,
	registerVendorContractCleanup,
	updateScripts,
} from './e2e-test-utils';
import { insiderTag } from './vendors/email-and-sms/insider';

const account = { partnerId: '123456', partnerName: 'yourpartner' };
const LOADER_SRC = 'https://yourpartner.api.useinsider.com/ins.js?id=123456';

const getLoader = function getLoader(): HTMLScriptElement | null {
	return document.querySelector<HTMLScriptElement>(
		`script[src="${LOADER_SRC}"]`
	);
};

describe('Insider loader contract', () => {
	registerVendorContractCleanup();
	afterEach(() => {
		vi.unstubAllGlobals();
		delete window.InsiderQueue;
	});

	it('has no vendor global, resource request, or storage write before marketing consent', () => {
		const append = installHeadProbe(() => undefined);
		const fetch = vi.fn();
		vi.stubGlobal('fetch', fetch);
		const storageWrite = vi.spyOn(Storage.prototype, 'setItem');
		const cookieWrite = vi.spyOn(Document.prototype, 'cookie', 'set');
		const scripts = [insiderTag(account)];

		loadScripts(scripts, deniedConsents);
		updateScripts(scripts, grantedMeasurementConsents);

		expect(append).not.toHaveBeenCalled();
		expect(fetch).not.toHaveBeenCalled();
		expect(window.InsiderQueue).toBeUndefined();
		expect(storageWrite).not.toHaveBeenCalled();
		expect(cookieWrite).not.toHaveBeenCalled();
	});

	it.each([
		{ ...account, partnerName: '' },
		{ ...account, partnerName: 'partner.example' },
		{ ...account, partnerId: ' ' },
	])('never boots an invalid account after a grant: %j', (options) => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const append = installHeadProbe(() => undefined);
		loadScripts([insiderTag(options)], grantedMarketingConsents);
		expect(append).not.toHaveBeenCalled();
		expect(window.InsiderQueue).toBeUndefined();
	});

	it('uses the normalized partner hostname and encodes the entire ID', () => {
		const scripts = [
			insiderTag({ partnerId: ' a&b=1 ', partnerName: ' YourPartner ' }),
		];
		loadScripts(scripts, grantedMarketingConsents);
		const element = document.querySelector('script');
		expect(element?.src).toBe(
			'https://yourpartner.api.useinsider.com/ins.js?id=a%26b%3D1'
		);
	});

	it('deduplicates equivalent registrations without replacing the queue', () => {
		const append = installHeadProbe(() => undefined);
		loadScripts([insiderTag(account)], grantedMarketingConsents);
		const queue = window.InsiderQueue;
		const element = getLoader();
		updateScripts([insiderTag(account)], grantedMarketingConsents);
		expect(append).toHaveBeenCalledTimes(1);
		expect(getLoader()).toBe(element);
		expect(window.InsiderQueue).toBe(queue);
		expect(queue).toEqual([
			{ type: 'user', value: { gdpr_optin: true } },
			{ type: 'other' },
			{ type: 'init' },
		]);
	});

	it('provides user, page payload and init before the permitted loader is appended', () => {
		const pageType = {
			type: 'category' as const,
			value: { breadcrumb: ['Clothing', 'Dresses'] },
		};
		let beforeAppend: unknown;
		let appendCount = 0;
		installHeadProbe((element) => {
			if (element.src === LOADER_SRC) {
				beforeAppend = structuredClone(window.InsiderQueue);
				appendCount += 1;
			}
		});
		const scripts = [insiderTag({ ...account, pageType })];
		loadScripts(scripts, deniedConsents);
		updateScripts(scripts, grantedMarketingConsents);

		expect(beforeAppend).toEqual([
			{ type: 'user', value: { gdpr_optin: true } },
			pageType,
			{ type: 'init' },
		]);
		expect(getLoader()?.async).toBe(true);
		updateScripts(scripts, { ...grantedMarketingConsents, measurement: true });
		expect(appendCount).toBe(1);
		expect(window.InsiderQueue).toEqual(beforeAppend);
	});

	it('sends the documented false and init updates to a running SDK and removes the loader', () => {
		const scripts = [insiderTag(account)];
		loadScripts(scripts, grantedMarketingConsents);
		const element = getLoader();
		expect(element).not.toBeNull();
		element?.dispatchEvent(new Event('load'));
		// Behavioral test double for the public queue method, not a vendor SDK capture.
		const push = vi.fn();
		const runtime = { push };
		window.InsiderQueue = runtime;

		const result = updateScripts(scripts, deniedConsents);

		expect(result.unloaded).toEqual(['insider']);
		expect(getLoader()).toBeNull();
		expect(window.InsiderQueue).toBe(runtime);
		expect(push.mock.calls).toEqual([
			[{ type: 'user', value: { gdpr_optin: false } }],
			[{ type: 'init' }],
		]);
		expect(push.mock.contexts).toEqual([runtime, runtime]);

		updateScripts(scripts, grantedMarketingConsents);
		expect(window.InsiderQueue).toBe(runtime);
		expect(getLoader()).not.toBe(element);
		expect(push.mock.calls.slice(2)).toEqual([
			[{ type: 'user', value: { gdpr_optin: true } }],
			[{ type: 'other' }],
			[{ type: 'init' }],
		]);
	});

	it('retains the denial update across a detached loader load event and regrant', () => {
		const scripts = [insiderTag({ ...account, pageType: { type: 'home' } })];
		loadScripts(scripts, grantedMarketingConsents);
		const stale = getLoader();
		const queue = window.InsiderQueue;
		updateScripts(scripts, deniedConsents);
		expect(stale?.isConnected).toBe(false);
		expect(window.InsiderQueue).toBe(queue);
		const deniedQueue = structuredClone(window.InsiderQueue);
		expect(deniedQueue).toEqual([
			{ type: 'user', value: { gdpr_optin: true } },
			{ type: 'home' },
			{ type: 'init' },
			{ type: 'user', value: { gdpr_optin: false } },
			{ type: 'init' },
		]);
		// Exercises loader completion only. It does not execute a late vendor SDK.
		stale?.dispatchEvent(new Event('load'));
		expect(window.InsiderQueue).toEqual(deniedQueue);

		updateScripts(scripts, grantedMarketingConsents);
		expect(getLoader()).not.toBe(stale);
		expect(window.InsiderQueue).toBe(queue);
		expect(window.InsiderQueue).toEqual([
			...(deniedQueue as unknown[]),
			{ type: 'user', value: { gdpr_optin: true } },
			{ type: 'home' },
			{ type: 'init' },
		]);
	});

	it('does not recreate the queue on a denied fresh page', () => {
		const scripts = [insiderTag(account)];
		loadScripts(scripts, grantedMarketingConsents);
		updateScripts(scripts, deniedConsents);
		clearAllScripts();
		delete window.InsiderQueue;
		loadScripts(scripts, deniedConsents);
		expect(window.InsiderQueue).toBeUndefined();
		expect(getLoader()).toBeNull();
	});

	it('uses the configured category instead of marketing', () => {
		const scripts = [insiderTag({ ...account, category: 'experience' })];
		loadScripts(scripts, grantedMarketingConsents);
		expect(getLoader()).toBeNull();
		expect(window.InsiderQueue).toBeUndefined();
		updateScripts(scripts, { ...deniedConsents, experience: true });
		expect(getLoader()).not.toBeNull();
		updateScripts(scripts, grantedMarketingConsents);
		expect(getLoader()).toBeNull();
		expect(window.InsiderQueue).toEqual([
			{ type: 'user', value: { gdpr_optin: true } },
			{ type: 'other' },
			{ type: 'init' },
			{ type: 'user', value: { gdpr_optin: false } },
			{ type: 'init' },
		]);
	});

	it('gates and revokes the vendor independently inside an allowed category', async () => {
		const kernel = createConsentKernel();
		const loader = createScriptLoader({
			kernel,
			scripts: [insiderTag(account)],
		});
		try {
			await kernel.commands.save(
				{ marketing: true },
				{ vendors: { insider: false } }
			);
			expect(getLoader()).toBeNull();
			expect(window.InsiderQueue).toBeUndefined();

			await kernel.commands.save(
				{ marketing: true },
				{ vendors: { insider: true } }
			);
			expect(getLoader()).not.toBeNull();
			const push = vi.fn();
			window.InsiderQueue = { push };
			await kernel.commands.save(
				{ marketing: true },
				{ vendors: { insider: false } }
			);
			expect(getLoader()).toBeNull();
			expect(push.mock.calls).toEqual([
				[{ type: 'user', value: { gdpr_optin: false } }],
				[{ type: 'init' }],
			]);
		} finally {
			loader.dispose();
			kernel.dispose();
		}
	});
});
