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
import type { InsiderPageType } from './vendors/email-and-sms/insider';

const account = { partnerId: '123456', partnerName: 'yourpartner' };
const LOADER_SRC = 'https://yourpartner.api.useinsider.com/ins.js?id=123456';
const product = {
	id: 'product-1',
	name: 'Blue dress',
	product_image_url: 'https://example.com/blue-dress.png',
	taxonomy: ['Dresses'],
	unit_price: 100,
	unit_sale_price: 90,
	url: 'https://example.com/blue-dress',
};
const purchasePage: InsiderPageType = {
	type: 'purchase',
	value: {
		items: [{ ...product, quantity: 1 }],
		order_id: 'order-1',
		total: 90,
	},
};

// Models last user/page and preserved currency on init, not IRM or delivery.
const installSdkModel = function installSdkModel() {
	const events: {
		currency: unknown;
		profileEmail: unknown;
		user: Record<string, unknown> | undefined;
	}[] = [];
	let user: Record<string, unknown> | undefined;
	let currency: unknown = 'USD';
	let profileEmail: unknown = 'previous@example.com';
	const pageViews: {
		gdprOptin: unknown;
		page: { type: unknown } | undefined;
	}[] = [];
	let page: { type: unknown } | undefined;
	let gdprOptin: unknown = true;
	const push = vi.fn((...entries: unknown[]) => {
		for (const entry of entries) {
			if (typeof entry !== 'object' || entry === null || !('type' in entry)) {
				throw new Error('Expected an Insider queue entry');
			}
			const value = 'value' in entry ? entry.value : undefined;
			switch (entry.type) {
				case 'user':
					if (typeof value === 'object' && value !== null) {
						user = { ...value };
						gdprOptin = user.gdpr_optin ?? true;
					}
					break;
				case 'currency':
					currency = value;
					break;
				case 'init':
					if (typeof user?.email === 'string') {
						profileEmail = user.email;
					}
					events.push({ currency, profileEmail, user: structuredClone(user) });
					pageViews.push({ gdprOptin, page: structuredClone(page) });
					break;
				case 'home':
				case 'other':
				case 'category':
				case 'product':
				case 'cart':
				case 'purchase':
					page = entry;
					break;
				default:
					throw new Error('Unexpected Insider queue entry type');
			}
		}
	});
	if (Array.isArray(window.InsiderQueue)) {
		push(...window.InsiderQueue);
	}
	const runtime = { events, pageViews, push };
	window.InsiderQueue = runtime;
	return runtime;
};

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
		const options = {
			...account,
			currency: 'GBP',
			user: { email: 'guest@example.com' },
		};
		const scripts = [insiderTag(options)];

		loadScripts(scripts, deniedConsents);
		updateScripts(scripts, grantedMeasurementConsents);

		expect(append).not.toHaveBeenCalled();
		expect(fetch).not.toHaveBeenCalled();
		expect(window.InsiderQueue).toBeUndefined();
		expect(storageWrite).not.toHaveBeenCalled();
		expect(cookieWrite).not.toHaveBeenCalled();
	});

	it.each(['callback', 'server-start'])(
		'uses the current checkout user instead of a queued previous user through %s',
		(mode) => {
			const user = {
				custom: { loyalty_id: 'guest-loyalty', preferences: { size: 'M' } },
				email: 'guest@example.com',
				gdpr_optin: false,
				phone_number: '+905551234567',
			};
			const options = {
				...account,
				currency: 'GBP',
				pageType: purchasePage,
				user,
			};
			const script = insiderTag(options);
			window.InsiderQueue = [
				{
					type: 'user',
					value: { email: 'previous@example.com', uuid: 'previous-user' },
				},
			];
			const start = script.serverStart?.(
				{
					consents: grantedMarketingConsents,
					hasConsent: true,
					id: script.id,
				},
				script
			);
			expect(start).toBeDefined();
			if (mode === 'callback') {
				loadScripts([script], grantedMarketingConsents);
			} else {
				// oxlint-disable-next-line no-new-func -- Execute the HTML start code the helper actually emits.
				new Function(`${start?.prelude ?? ''};${start?.code}`)();
			}
			const runtime = installSdkModel();
			expect(runtime.events).toEqual([
				{
					currency: 'GBP',
					profileEmail: 'guest@example.com',
					user: { ...user, gdpr_optin: true },
				},
			]);
			expect(runtime.pageViews).toEqual([
				{ gdprOptin: true, page: purchasePage },
			]);
			expect(user.gdpr_optin).toBe(false);
		}
	);

	it.each<InsiderPageType>([
		{ type: 'product', value: product },
		{ type: 'cart', value: purchasePage.value },
		purchasePage,
	])(
		'sets current currency before the $type page and init instead of using stale currency',
		(pageType) => {
			const options = { ...account, currency: 'GBP', pageType };
			window.InsiderQueue = [{ type: 'currency', value: 'EUR' }];
			let beforeAppend: unknown;
			installHeadProbe(() => {
				beforeAppend = structuredClone(window.InsiderQueue);
			});
			loadScripts([insiderTag(options)], grantedMarketingConsents);
			expect(beforeAppend).toEqual([
				{ type: 'currency', value: 'EUR' },
				{ type: 'user', value: { gdpr_optin: true } },
				{ type: 'currency', value: 'GBP' },
				pageType,
				{ type: 'init' },
			]);
			const runtime = installSdkModel();
			expect(runtime.events.at(-1)?.currency).toBe('GBP');
		}
	);

	it('does not recover historical identity or reset preserved currency when the caller omits them', () => {
		window.InsiderQueue = [
			{ type: 'user', value: { email: 'previous@example.com' } },
			{ type: 'currency', value: 'EUR' },
		];
		loadScripts([insiderTag(account)], grantedMarketingConsents);
		const runtime = installSdkModel();
		expect(runtime.events).toEqual([
			{
				currency: 'EUR',
				profileEmail: 'previous@example.com',
				user: { gdpr_optin: true },
			},
		]);
	});

	it('sends only false user consent on denial even when caller attributes contain true', () => {
		const options = {
			...account,
			currency: 'GBP',
			user: { email: 'guest@example.com', gdpr_optin: true },
		};
		const scripts = [insiderTag(options)];
		loadScripts(scripts, grantedMarketingConsents);
		const runtime = installSdkModel();
		runtime.push.mockClear();
		updateScripts(scripts, deniedConsents);
		expect(runtime.push.mock.calls).toEqual([
			[{ type: 'user', value: { gdpr_optin: false } }],
			[{ type: 'other' }],
			[{ type: 'init' }],
		]);
		expect(runtime.events.at(-1)?.user).toEqual({ gdpr_optin: false });
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

	it('sends false, a neutral page and init to a running SDK and removes the loader', () => {
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
			[{ type: 'other' }],
			[{ type: 'init' }],
		]);
		expect(push.mock.contexts).toEqual([runtime, runtime, runtime]);

		updateScripts(scripts, grantedMarketingConsents);
		expect(window.InsiderQueue).toBe(runtime);
		expect(getLoader()).not.toBe(element);
		expect(push.mock.calls.slice(3)).toEqual([
			[{ type: 'user', value: { gdpr_optin: true } }],
			[{ type: 'other' }],
			[{ type: 'init' }],
		]);
	});

	it.each(['configured', 'manual SPA'])(
		'does not replay a %s purchase on withdrawal or repeat denial',
		(source) => {
			const scripts = [
				insiderTag({
					...account,
					pageType: source === 'configured' ? purchasePage : { type: 'other' },
				}),
			];
			loadScripts(scripts, grantedMarketingConsents);
			getLoader()?.dispatchEvent(new Event('load'));
			const runtime = installSdkModel();
			if (source === 'manual SPA') {
				runtime.push(purchasePage);
				runtime.push({ type: 'init' });
			}
			const initialViews = [...runtime.pageViews];
			expect(initialViews.at(-1)).toEqual({
				gdprOptin: true,
				page: purchasePage,
			});
			updateScripts(scripts, {
				...grantedMarketingConsents,
				measurement: true,
			});
			expect(runtime.pageViews).toEqual(initialViews);

			updateScripts(scripts, deniedConsents);
			updateScripts(scripts, deniedConsents);
			updateScripts(scripts, grantedMeasurementConsents);

			expect(runtime.pageViews).toEqual([
				...initialViews,
				{ gdprOptin: false, page: { type: 'other' } },
			]);
			expect(
				runtime.pageViews.filter(({ page }) => page?.type === 'purchase')
			).toHaveLength(1);
			expect(getLoader()).toBeNull();
		}
	);

	it('processes an earlier queued purchase once if the SDK starts after withdrawal', () => {
		const scripts = [insiderTag({ ...account, pageType: purchasePage })];
		loadScripts(scripts, grantedMarketingConsents);
		const stale = getLoader();
		updateScripts(scripts, deniedConsents);
		expect(stale?.isConnected).toBe(false);
		expect(window.InsiderQueue).toEqual([
			{ type: 'user', value: { gdpr_optin: true } },
			purchasePage,
			{ type: 'init' },
			{ type: 'user', value: { gdpr_optin: false } },
			{ type: 'other' },
			{ type: 'init' },
		]);

		const runtime = installSdkModel();
		stale?.dispatchEvent(new Event('load'));
		expect(runtime.pageViews).toEqual([
			{ gdprOptin: true, page: purchasePage },
			{ gdprOptin: false, page: { type: 'other' } },
		]);
		expect(getLoader()).toBeNull();
	});

	it('reuses the supplied purchase on regrant, requiring a guarded configuration rebuild', () => {
		const scripts = [insiderTag({ ...account, pageType: purchasePage })];
		loadScripts(scripts, grantedMarketingConsents);
		getLoader()?.dispatchEvent(new Event('load'));
		const runtime = installSdkModel();
		updateScripts(scripts, deniedConsents);
		updateScripts(scripts, grantedMarketingConsents);
		expect(runtime.pageViews).toEqual([
			{ gdprOptin: true, page: purchasePage },
			{ gdprOptin: false, page: { type: 'other' } },
			{ gdprOptin: true, page: purchasePage },
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
			{ type: 'other' },
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
			{ type: 'other' },
			{ type: 'init' },
		]);
	});

	it('gates and revokes the vendor independently inside an allowed category', async () => {
		const kernel = createConsentKernel();
		const loader = createScriptLoader({
			kernel,
			scripts: [insiderTag({ ...account, pageType: purchasePage })],
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
			getLoader()?.dispatchEvent(new Event('load'));
			const runtime = installSdkModel();
			runtime.push.mockClear();
			await kernel.commands.save(
				{ marketing: true },
				{ vendors: { insider: false } }
			);
			expect(getLoader()).toBeNull();
			expect(runtime.push.mock.calls).toEqual([
				[{ type: 'user', value: { gdpr_optin: false } }],
				[{ type: 'other' }],
				[{ type: 'init' }],
			]);
			await kernel.commands.save(
				{ marketing: true, measurement: true },
				{ vendors: { insider: false } }
			);
			expect(runtime.pageViews).toEqual([
				{ gdprOptin: true, page: purchasePage },
				{ gdprOptin: false, page: { type: 'other' } },
			]);
		} finally {
			loader.dispose();
			kernel.dispose();
		}
	});
});
