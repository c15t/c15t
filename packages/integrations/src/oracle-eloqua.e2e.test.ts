/** @vitest-environment jsdom */
import { createConsentKernel } from '@c15t/core';
import { createScriptLoader } from '@c15t/core/modules/script-loader';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	clearAllScripts,
	deniedConsents,
	installHeadProbe,
	loadScripts,
	registerVendorContractCleanup,
	updateScripts,
} from './e2e-test-utils';
import type { eloquaTracking as EloquaTrackingFactory } from './vendors/analytics/oracle-eloqua';

let eloquaTracking: typeof EloquaTrackingFactory;

beforeEach(async () => {
	// Node 25+ replaces jsdom's storage globals with its own Web Storage.
	vi.stubGlobal('localStorage', jsdom.window.localStorage);
	vi.stubGlobal('sessionStorage', jsdom.window.sessionStorage);
	vi.resetModules();
	({ eloquaTracking } = await import('./vendors/analytics/oracle-eloqua'));
});

afterEach(() => {
	vi.unstubAllGlobals();
});

const GLOBALS = ['_elqQ'];
const granted = { ...deniedConsents, marketing: true };
const unrelated = { ...deniedConsents, measurement: true };
const getLoader = (): HTMLScriptElement => {
	const loader = document.querySelector<HTMLScriptElement>('script[src]');
	if (!loader) {
		throw new Error('Expected Oracle Eloqua loader');
	}
	return loader;
};

describe('Oracle Eloqua consent loader', () => {
	registerVendorContractCleanup();
	afterEach(() => {
		for (const name of GLOBALS) {
			Reflect.deleteProperty(window, name);
		}
		localStorage.clear();
		sessionStorage.clear();
	});
	it('creates no vendor requests, globals or storage before mapped consent', () => {
		const scripts = [eloquaTracking({ siteId: '1973398186' })];
		const cookies = document.cookie;
		const local = { ...localStorage };
		const session = { ...sessionStorage };
		const cookieWrite = vi.spyOn(document, 'cookie', 'set');
		const storageWrite = vi.spyOn(Storage.prototype, 'setItem');
		loadScripts(scripts, deniedConsents);
		updateScripts(scripts, unrelated);
		expect(document.querySelector('script[src]')).toBeNull();
		for (const name of GLOBALS) {
			expect(
				(window as unknown as Record<string, unknown>)[name]
			).toBeUndefined();
		}
		expect(document.cookie).toBe(cookies);
		expect({ ...localStorage }).toEqual(local);
		expect({ ...sessionStorage }).toEqual(session);
		expect(cookieWrite).not.toHaveBeenCalled();
		expect(storageWrite).not.toHaveBeenCalled();
		updateScripts(scripts, granted);
		const first = getLoader();
		expect(first.src).toBe('https://img.en25.com/i/elqCfg.min.js');
		updateScripts(scripts, granted);
		expect(getLoader()).toBe(first);
		updateScripts(scripts, deniedConsents);
		expect(first.isConnected).toBe(true);
		updateScripts(scripts, granted);
		expect(getLoader()).toBe(first);
		expect(document.querySelectorAll('script[src]')).toHaveLength(1);
	});
	it('honors an overridden category', () => {
		const scripts = [
			eloquaTracking({ category: 'experience', siteId: '1973398186' }),
		];
		loadScripts(scripts, granted);
		expect(document.querySelector('script[src]')).toBeNull();
		updateScripts(scripts, { ...deniedConsents, experience: true });
		expect(getLoader()).toBeDefined();
	});
});

describe('Eloqua dispatcher lifecycle', () => {
	registerVendorContractCleanup();
	afterEach(() => {
		clearAllScripts();
		// Settle intercepted requests before the shared cleanup destroys the DOM.
		for (let count = 0; count < 20; count += 1) {
			const response = document.querySelector('script[src*="pps="]');
			if (!response) {
				break;
			}
			response.dispatchEvent(new Event('error'));
			response.remove();
		}
		delete window._elqQ;
	});
	const installDispatcher = () => {
		const push = vi.fn((command: unknown[]) => {
			if (command[0] === 'elqOptIn' || command[0] === 'elqOptOut') {
				const response = document.createElement('script');
				response.src = `https://s1973398186.t.eloqua.com/visitor/v200/svrGP?pps=${command[0] === 'elqOptIn' ? '41' : '42'}&siteid=1973398186`;
				document.head.append(response);
			}
		});
		window._elqQ = {
			push(command) {
				// Configuration is replayed on each SDK execution; record consent and tracking.
				if (
					command[0] !== 'elqSetSiteId' &&
					command[0] !== 'elqUseFirstPartyCookie'
				) {
					return push(command);
				}
			},
		};
		return push;
	};
	it.each([
		[{}, {}],
		[{}, { category: 'marketing' }],
		[{}, { siteId: 1973398186 }],
		[
			{},
			{
				firstPartyCookieDomain: '   ',
				scriptUrl: ' https://img.en25.com/i/elqCfg.min.js ',
				siteId: ' 1973398186 ',
			},
		],
		[
			{ firstPartyCookieDomain: 'tracking.example.com' },
			{ firstPartyCookieDomain: 'Tracking.Example.COM' },
		],
		[
			{ firstPartyCookieDomain: 'Tracking.Example.COM' },
			{ firstPartyCookieDomain: 'tracking.example.com' },
		],
	] as const)(
		'shares opt-in and page tracking for equivalent registrations, case %#',
		(base, overrides) => {
			const kernel = createConsentKernel();
			void kernel.commands.save(granted);
			const options = { siteId: '1973398186', ...base };
			const first = createScriptLoader({
				kernel,
				scripts: [eloquaTracking(options)],
			});
			const second = createScriptLoader({
				kernel,
				scripts: [eloquaTracking({ ...options, ...overrides })],
			});
			try {
				const loader = getLoader();
				const push = installDispatcher();
				loader.dispatchEvent(new Event('load'));
				expect(push.mock.calls).toEqual([[['elqOptIn']]]);
				first.dispose();
				document
					.querySelector('script[src*="pps=41"]')
					?.dispatchEvent(new Event('load'));
				void kernel.commands.save(deniedConsents);
				document
					.querySelector('script[src*="pps=42"]')
					?.dispatchEvent(new Event('load'));
				void kernel.commands.save(granted);
				Array.from(document.querySelectorAll('script[src*="pps=41"]'))
					.at(-1)
					?.dispatchEvent(new Event('load'));
				expect(push.mock.calls).toEqual([
					[['elqOptIn']],
					[['elqTrackPageView', window.location.href]],
					[['elqOptOut']],
					[['elqOptIn']],
					[['elqTrackPageView', window.location.href]],
				]);
				expect(getLoader()).toBe(loader);
			} finally {
				second.dispose();
				first.dispose();
				kernel.dispose();
			}
		}
	);
	it.each([
		['marketing', 'experience'],
		['experience', 'marketing'],
	] as const)(
		'tracks an earlier %s owner regrant after a shared %s owner tracked',
		async (firstCategory, secondCategory) => {
			const firstKernel = createConsentKernel();
			const secondKernel = createConsentKernel();
			const consents = { ...granted, experience: true };
			await Promise.all([
				firstKernel.commands.save(consents),
				secondKernel.commands.save(consents),
			]);
			const first = createScriptLoader({
				kernel: firstKernel,
				scripts: [
					eloquaTracking({ category: firstCategory, siteId: '1973398186' }),
				],
			});
			const element = getLoader();
			const push = installDispatcher();
			element.dispatchEvent(new Event('load'));
			const second = createScriptLoader({
				kernel: secondKernel,
				scripts: [
					eloquaTracking({ category: secondCategory, siteId: '1973398186' }),
				],
			});
			const finish = (pps: '41' | '42') => {
				const response = Array.from(
					document.querySelectorAll(`script[src*="pps=${pps}"]`)
				).at(-1);
				expect(response).toBeDefined();
				response?.dispatchEvent(new Event('load'));
				return response;
			};
			try {
				await Promise.resolve();
				finish('41');
				await firstKernel.commands.save({
					...consents,
					[firstCategory]: false,
				});
				finish('42');
				await firstKernel.commands.save(consents);
				await firstKernel.commands.save(consents);
				const response = finish('41');
				response?.dispatchEvent(new Event('load'));
				await firstKernel.commands.save(consents);
				expect(push.mock.calls).toEqual([
					[['elqOptIn']],
					[['elqTrackPageView', window.location.href]],
					[['elqOptOut']],
					[['elqOptIn']],
					[['elqTrackPageView', window.location.href]],
				]);
				expect(getLoader()).toBe(element);
			} finally {
				first.dispose();
				second.dispose();
				firstKernel.dispose();
				secondKernel.dispose();
			}
		}
	);
	it.each([false, true])(
		'aggregates a never-mounted denial across distinct kernels, granted first: %s',
		async (grantedFirst) => {
			const deniedKernel = createConsentKernel();
			const grantedKernel = createConsentKernel();
			await grantedKernel.commands.save(granted);
			const create = () => eloquaTracking({ siteId: '1973398186' });
			const kernels = grantedFirst
				? [grantedKernel, deniedKernel]
				: [deniedKernel, grantedKernel];
			const loaders = kernels.map((kernel) =>
				createScriptLoader({ kernel, scripts: [create()] })
			);
			try {
				expect(window._elqQ).toEqual(
					grantedFirst ? [['elqSetSiteId', '1973398186']] : undefined
				);
				expect(document.querySelectorAll('script[src]')).toHaveLength(
					grantedFirst ? 1 : 0
				);
				let initialCalls: unknown[] = [];
				let push: ReturnType<typeof installDispatcher>;
				if (grantedFirst) {
					push = installDispatcher();
					getLoader().dispatchEvent(new Event('load'));
					initialCalls = [...push.mock.calls];
					document
						.querySelector('script[src*="pps=42"]')
						?.dispatchEvent(new Event('load'));
					await deniedKernel.commands.save(granted);
				} else {
					await deniedKernel.commands.save(granted);

					push = installDispatcher();
					getLoader().dispatchEvent(new Event('load'));
				}
				expect(initialCalls).toEqual(grantedFirst ? [[['elqOptOut']]] : []);
				expect(push).toHaveBeenCalledWith(['elqOptIn']);
				document
					.querySelector('script[src*="pps=41"]')
					?.dispatchEvent(new Event('load'));
				await deniedKernel.commands.save(deniedConsents);
				expect(push.mock.calls.at(-1)).toEqual([['elqOptOut']]);
				document
					.querySelectorAll('script[src*="pps=42"]')
					.item(grantedFirst ? 1 : 0)
					?.dispatchEvent(new Event('load'));
				await deniedKernel.commands.save(granted);
				expect(push.mock.calls.at(-1)).toEqual([['elqOptIn']]);
				loaders[kernels.indexOf(deniedKernel)]?.dispose();
				Array.from(document.querySelectorAll('script[src*="pps=41"]'))
					.at(-1)
					?.dispatchEvent(new Event('load'));
				expect(push.mock.calls.at(-1)).toEqual([
					['elqTrackPageView', window.location.href],
				]);
			} finally {
				for (const loader of loaders) {
					loader.dispose();
				}
				deniedKernel.dispose();
				grantedKernel.dispose();
			}
		}
	);
	it('configures a fresh SDK when a denied provider survives the loaded provider', async () => {
		const grantedKernel = createConsentKernel();
		const deniedKernel = createConsentKernel();
		await grantedKernel.commands.save(granted);
		const options = {
			firstPartyCookieDomain: 'tracking.example.com',
			siteId: '1973398186',
		};
		const first = createScriptLoader({
			kernel: grantedKernel,
			scripts: [eloquaTracking(options)],
		});
		let second: ReturnType<typeof createScriptLoader> | undefined;
		try {
			const initial = getLoader();
			const retired = installDispatcher();
			initial.dispatchEvent(new Event('load'));
			document
				.querySelector('script[src*="pps=41"]')
				?.dispatchEvent(new Event('load'));
			second = createScriptLoader({
				kernel: deniedKernel,
				scripts: [eloquaTracking(options)],
			});
			document
				.querySelector('script[src*="pps=42"]')
				?.dispatchEvent(new Event('load'));
			first.dispose();
			expect(initial.isConnected).toBe(false);
			await deniedKernel.commands.save(granted);
			expect(window._elqQ).toEqual([
				['elqSetSiteId', '1973398186'],
				['elqUseFirstPartyCookie', 'tracking.example.com'],
			]);
			expect(retired.mock.calls.at(-1)).toEqual([['elqOptOut']]);
			const replacement = document.querySelector(
				'script[src="https://img.en25.com/i/elqCfg.min.js"]'
			);
			expect(replacement).not.toBeNull();
			const active = installDispatcher();
			replacement?.dispatchEvent(new Event('load'));
			document.cookie = 'OPTIN=1; path=/';
			Array.from(document.querySelectorAll('script[src*="pps=41"]'))
				.at(-1)
				?.dispatchEvent(new Event('load'));
			expect(active.mock.calls.at(-1)).toEqual([
				['elqTrackPageView', window.location.href],
			]);
			await deniedKernel.commands.save(deniedConsents);
			expect(active.mock.calls.at(-1)).toEqual([['elqOptOut']]);
			document.cookie = 'OPTIN=0; path=/';
			Array.from(document.querySelectorAll('script[src*="pps=42"]'))
				.at(-1)
				?.dispatchEvent(new Event('load'));
			expect(document.cookie).toContain('OPTIN=0');
		} finally {
			second?.dispose();
			first.dispose();
			grantedKernel.dispose();
			deniedKernel.dispose();
		}
	});
	it('retains an adopted load completion while another provider blocks initialization', async () => {
		const firstKernel = createConsentKernel();
		const deniedKernel = createConsentKernel();
		const adopterKernel = createConsentKernel();
		const adopterGranted = { ...granted, experience: true };
		await firstKernel.commands.save(granted);
		await adopterKernel.commands.save(adopterGranted);
		const options = { siteId: '1973398186' };
		const first = createScriptLoader({
			kernel: firstKernel,
			scripts: [eloquaTracking(options)],
		});
		let blocker: ReturnType<typeof createScriptLoader> | undefined;
		let adopter: ReturnType<typeof createScriptLoader> | undefined;
		const finish = (pps: '41' | '42') => {
			const response = Array.from(
				document.querySelectorAll(`script[src*="pps=${pps}"]`)
			).at(-1);
			expect(response).toBeDefined();
			response?.dispatchEvent(new Event('load'));
		};
		try {
			const element = getLoader();
			const push = installDispatcher();
			element.dispatchEvent(new Event('load'));
			finish('41');
			blocker = createScriptLoader({
				kernel: deniedKernel,
				scripts: [eloquaTracking(options)],
			});
			finish('42');
			adopter = createScriptLoader({
				kernel: adopterKernel,
				scripts: [eloquaTracking({ ...options, category: 'experience' })],
			});
			await Promise.resolve();
			expect(push.mock.calls.at(-1)).toEqual([['elqOptOut']]);
			blocker.dispose();
			finish('41');
			const beforeDisposal = [...push.mock.calls];
			first.dispose();
			expect(push.mock.calls).toEqual(beforeDisposal);
			expect(getLoader()).toBe(element);
			await adopterKernel.commands.save(deniedConsents);
			finish('42');
			await adopterKernel.commands.save(adopterGranted);
			finish('41');
			expect(push.mock.calls).toEqual([
				[['elqOptIn']],
				[['elqTrackPageView', window.location.href]],
				[['elqOptOut']],
				[['elqOptIn']],
				[['elqTrackPageView', window.location.href]],
				[['elqOptOut']],
				[['elqOptIn']],
				[['elqTrackPageView', window.location.href]],
			]);
			expect(getLoader()).toBe(element);
		} finally {
			adopter?.dispose();
			blocker?.dispose();
			first.dispose();
			firstKernel.dispose();
			deniedKernel.dispose();
			adopterKernel.dispose();
		}
	});
	it.each([false, true])(
		'preserves shared setup across category replacement, SDK already loaded: %s',
		async (alreadyLoaded) => {
			const kernels = [createConsentKernel(), createConsentKernel()];
			const consents = { ...granted, experience: true };
			await Promise.all(
				kernels.map((kernel) => kernel.commands.save(consents))
			);
			const events: { action: string }[] = [];
			const loaders = kernels.map((kernel) =>
				createScriptLoader({
					kernel,
					onDebug: (event) => events.push(event),
					scripts: [eloquaTracking({ siteId: '1973398186' })],
				})
			);
			try {
				const element = getLoader();
				let push: ReturnType<typeof installDispatcher> | undefined;
				let dispatcher = window._elqQ;
				if (alreadyLoaded) {
					push = installDispatcher();
					dispatcher = window._elqQ;
					element.dispatchEvent(new Event('load'));
					document
						.querySelector('script[src*="pps=41"]')
						?.dispatchEvent(new Event('load'));
				}
				loaders[0]?.updateScripts([
					eloquaTracking({ category: 'experience', siteId: '1973398186' }),
				]);
				await Promise.resolve();
				expect(getLoader()).toBe(element);
				expect(window._elqQ).toBe(dispatcher);
				if (!alreadyLoaded) {
					push = installDispatcher();
					element.dispatchEvent(new Event('load'));
				}
				for (let count = 0; count < 4; count += 1) {
					const response = document.querySelector<HTMLScriptElement>(
						'script[src*="pps="]'
					);
					if (!response) {
						break;
					}
					const permitted =
						new URL(response.src).searchParams.get('pps') === '41';
					document.cookie = `OPTIN=${permitted ? '1' : '0'}; path=/`;
					response.dispatchEvent(new Event('load'));
					response.remove();
				}
				expect(document.cookie).toContain('OPTIN=1');
				expect(push?.mock.calls.at(-1)).toEqual([
					['elqTrackPageView', window.location.href],
				]);
				expect(events.filter((event) => event.action === 'error')).toEqual([]);
			} finally {
				for (const loader of loaders) {
					loader.dispose();
				}
				for (const kernel of kernels) {
					kernel.dispose();
				}
			}
		}
	);
	it.each([false, true])(
		'keeps a configured dispatcher after a detached SDK executes, old first: %s',
		async (oldFirst) => {
			const kernels = [
				createConsentKernel(),
				createConsentKernel(),
				createConsentKernel(),
			] as const;
			await Promise.all(kernels.map((kernel) => kernel.commands.save(granted)));
			const create = () => eloquaTracking({ siteId: '1973398186' });
			const loaders = kernels.map((kernel, index) =>
				index === 0
					? createScriptLoader({ kernel, scripts: [create()] })
					: undefined
			);
			const execute = (element: HTMLScriptElement) => {
				const queue = window._elqQ;
				let configured = false;
				const dispatcher = {
					push: (command: unknown[]) => {
						if (command[0] === 'elqSetSiteId') {
							configured = command[1] === '1973398186';
						}
						if (
							configured &&
							['elqOptIn', 'elqOptOut'].includes(String(command[0]))
						) {
							const response = document.createElement('script');
							response.src = `https://s1973398186.t.eloqua.com/visitor/v200/svrGP?pps=${command[0] === 'elqOptIn' ? '41' : '42'}&siteid=1973398186`;
							document.head.append(response);
						}
					},
				};
				window._elqQ = dispatcher;
				if (Array.isArray(queue)) {
					for (const command of queue) {
						dispatcher.push(command);
					}
				}
				element.dispatchEvent(new Event('load'));
			};
			try {
				const retired = getLoader();
				loaders[0]?.dispose();
				loaders[1] = createScriptLoader({
					kernel: kernels[1],
					scripts: [create()],
				});
				const active = getLoader();
				expect(active).not.toBe(retired);
				for (const element of oldFirst
					? [retired, active]
					: [active, retired]) {
					execute(element);
				}
				const optIn = document.querySelector('script[src*="pps=41"]');
				expect(optIn).not.toBeNull();
				document.cookie = 'OPTIN=1; path=/';
				optIn?.dispatchEvent(new Event('load'));
				loaders[2] = createScriptLoader({
					kernel: kernels[2],
					scripts: [create()],
				});
				await Promise.resolve();
				await kernels[1]?.commands.save(deniedConsents);
				const optOut = document.querySelector('script[src*="pps=42"]');
				expect(optOut).not.toBeNull();
				document.cookie = 'OPTIN=0; path=/';
				optOut?.dispatchEvent(new Event('load'));
				expect(document.cookie).toContain('OPTIN=0');
			} finally {
				for (const loader of loaders) {
					loader?.dispose();
				}
				for (const kernel of kernels) {
					kernel.dispose();
				}
			}
		}
	);
	it('waits for outstanding consent responses before sending the opposite choice', () => {
		const scripts = [eloquaTracking({ siteId: '1973398186' })];
		loadScripts(scripts, granted);
		const push = installDispatcher();
		getLoader().dispatchEvent(new Event('load'));
		const response = document.querySelector('script[src*="pps=41"]');
		updateScripts(scripts, deniedConsents);
		expect(push).not.toHaveBeenCalledWith(['elqOptOut']);
		response?.dispatchEvent(new Event('load'));
		expect(push.mock.calls.at(-1)).toEqual([['elqOptOut']]);
		expect(push).not.toHaveBeenCalledWith([
			'elqTrackPageView',
			window.location.href,
		]);
	});
	it('serializes rapid choices and settles the vendor cookie to the latest choice', () => {
		const scripts = [eloquaTracking({ siteId: '1973398186' })];
		loadScripts(scripts, granted);
		const push = installDispatcher();
		getLoader().dispatchEvent(new Event('load'));
		const finish = (pps: '41' | '42') => {
			const response = Array.from(
				document.querySelectorAll(`script[src*="pps=${pps}"]`)
			).at(-1);
			expect(response).toBeDefined();
			document.cookie = `OPTIN=${pps === '41' ? '1' : '0'}; path=/`;
			response?.dispatchEvent(new Event('load'));
		};
		updateScripts(scripts, deniedConsents);
		updateScripts(scripts, granted);
		updateScripts(scripts, deniedConsents);
		finish('41');
		expect(push.mock.calls).toEqual([[['elqOptIn']], [['elqOptOut']]]);
		updateScripts(scripts, granted);
		updateScripts(scripts, granted);
		expect(push).toHaveBeenCalledTimes(2);
		finish('42');
		expect(push.mock.calls.at(-1)).toEqual([['elqOptIn']]);
		finish('41');
		expect(document.cookie).toContain('OPTIN=1');
		expect(push.mock.calls.at(-1)).toEqual([
			['elqTrackPageView', window.location.href],
		]);
		updateScripts(scripts, deniedConsents);
		finish('42');
		expect(document.cookie).toContain('OPTIN=0');
		expect(push).toHaveBeenCalledTimes(5);
	});
	it('settles a pending opt-in to denial on disposal without sending a page view', () => {
		loadScripts([eloquaTracking({ siteId: '1973398186' })], granted);
		const push = installDispatcher();
		getLoader().dispatchEvent(new Event('load'));
		const response = document.querySelector('script[src*="pps=41"]');
		clearAllScripts();
		response?.dispatchEvent(new Event('load'));
		expect(push.mock.calls).toEqual([[['elqOptIn']], [['elqOptOut']]]);
	});
	it('does not immediately retry failed responses or send a page view after an opt-in error', () => {
		const scripts = [eloquaTracking({ siteId: '1973398186' })];
		loadScripts(scripts, granted);
		const push = installDispatcher();
		getLoader().dispatchEvent(new Event('load'));
		const response = document.querySelector('script[src*="pps=41"]');
		response?.dispatchEvent(new Event('error'));
		response?.dispatchEvent(new Event('load'));
		expect(push.mock.calls).toEqual([[['elqOptIn']]]);
		updateScripts(scripts, deniedConsents);
		document
			.querySelector('script[src*="pps=42"]')
			?.dispatchEvent(new Event('error'));
		expect(push.mock.calls).toEqual([[['elqOptIn']], [['elqOptOut']]]);
	});
	it.each([false, true])(
		'retries a failed opt-out on a later denied update, remounted: %s',
		(remounted) => {
			const scripts = [eloquaTracking({ siteId: '1973398186' })];
			loadScripts(scripts, granted);
			const push = installDispatcher();
			getLoader().dispatchEvent(new Event('load'));
			document
				.querySelector('script[src*="pps=41"]')
				?.dispatchEvent(new Event('load'));
			document.cookie = 'OPTIN=1; path=/';
			if (remounted) {
				clearAllScripts();
			} else {
				updateScripts(scripts, deniedConsents);
			}
			document
				.querySelector('script[src*="pps=42"]')
				?.dispatchEvent(new Event('error'));
			expect(push).toHaveBeenCalledTimes(3);
			loadScripts(scripts, deniedConsents);
			expect(push).toHaveBeenCalledTimes(4);
			expect(push.mock.calls.at(-1)).toEqual([['elqOptOut']]);
			const response = Array.from(
				document.querySelectorAll('script[src*="pps=42"]')
			).at(-1);
			expect(response).toBeDefined();
			document.cookie = 'OPTIN=0; path=/';
			response?.dispatchEvent(new Event('load'));
			loadScripts(scripts, deniedConsents);
			expect(push).toHaveBeenCalledTimes(4);
			expect(document.cookie).toContain('OPTIN=0');
		}
	);
	it.each([false, true])(
		'honors a custom category and vendor denial until disposal, granted first: %s',
		async (grantedFirst) => {
			const deniedKernel = createConsentKernel();
			const grantedKernel = createConsentKernel();
			const consents = {
				...deniedConsents,
				experience: true,
				measurement: true,
			};
			for (const kernel of [deniedKernel, grantedKernel]) {
				kernel.set.vendors({
					declared: [
						{
							category: { and: ['experience', 'measurement'] },
							id: 'oracle-eloqua',
							name: 'Oracle Eloqua',
							presentable: true,
							privacyPolicyUrl: 'https://www.oracle.com/legal/privacy/',
							source: 'config',
						},
					],
				});
			}
			await deniedKernel.commands.save(consents, {
				vendors: { 'oracle-eloqua': false },
			});
			await grantedKernel.commands.save(consents, {
				vendors: { 'oracle-eloqua': true },
			});
			const deniedScript = eloquaTracking({
				category: { and: ['experience', 'measurement'] },
				firstPartyCookieDomain: 'Tracking.Example.COM',
				siteId: ' 1973398186 ',
			});
			const grantedScript = eloquaTracking({
				category: { and: ['experience', 'measurement'] },
				firstPartyCookieDomain: 'tracking.example.com',
				scriptUrl: ' https://img.en25.com/i/elqCfg.min.js ',
				siteId: 1973398186,
			});
			expect(deniedScript).toBe(grantedScript);
			const options = [
				{ kernel: deniedKernel, scripts: [deniedScript] },
				{ kernel: grantedKernel, scripts: [grantedScript] },
			];
			if (grantedFirst) {
				options.reverse();
			}
			const loaders = options.map((config) => createScriptLoader(config));
			try {
				expect(window._elqQ).toEqual(
					grantedFirst
						? [
								['elqSetSiteId', '1973398186'],
								['elqUseFirstPartyCookie', 'tracking.example.com'],
							]
						: undefined
				);
				expect(document.querySelectorAll('script[src]')).toHaveLength(
					grantedFirst ? 1 : 0
				);
				loaders[grantedFirst ? 1 : 0]?.dispose();
				expect(window._elqQ).toEqual([
					['elqSetSiteId', '1973398186'],
					['elqUseFirstPartyCookie', 'tracking.example.com'],
				]);
				const push = installDispatcher();
				getLoader().dispatchEvent(new Event('load'));
				document
					.querySelector('script[src*="pps=41"]')
					?.dispatchEvent(new Event('load'));
				expect(push.mock.calls.at(-1)).toEqual([
					['elqTrackPageView', window.location.href],
				]);
				await grantedKernel.commands.save({ ...consents, experience: false });
				expect(push.mock.calls.at(-1)).toEqual([['elqOptOut']]);
			} finally {
				for (const loader of loaders) {
					loader.dispose();
				}
				deniedKernel.dispose();
				grantedKernel.dispose();
			}
		}
	);
	it('reads the full current page URL when a delayed opt-in completes', () => {
		const previous = window.location.href;
		try {
			window.history.replaceState(null, '', '/before?query=first#initial');
			loadScripts([eloquaTracking({ siteId: '1973398186' })], granted);
			const push = installDispatcher();
			getLoader().dispatchEvent(new Event('load'));
			window.history.replaceState(null, '', '/after?query=second#current');
			document
				.querySelector('script[src*="pps=41"]')
				?.dispatchEvent(new Event('load'));
			expect(push.mock.calls.at(-1)).toEqual([
				['elqTrackPageView', window.location.href],
			]);
		} finally {
			window.history.replaceState(null, '', previous);
		}
	});
	it.each([
		{ category: 'experience' },
		{ scriptUrl: 'https://tracking.example.com/eloqua.js' },
	] as const)(
		'serializes a replacement configuration after a retired opt-out: %j',
		(replacement) => {
			const consents = { ...granted, experience: true };
			loadScripts([eloquaTracking({ siteId: '1973398186' })], consents);
			const retired = installDispatcher();
			getLoader().dispatchEvent(new Event('load'));
			document
				.querySelector('script[src*="pps=41"]')
				?.dispatchEvent(new Event('load'));
			const scripts = [
				eloquaTracking({ siteId: '1973398186', ...replacement }),
			];
			updateScripts(scripts, consents);
			const optOut = document.querySelector('script[src*="pps=42"]');
			expect(optOut).not.toBeNull();
			const active = installDispatcher();
			const replacementLoader = document.querySelector(
				`script[src="${scripts[0]?.src}"]`
			);
			expect(replacementLoader).not.toBeNull();
			replacementLoader?.dispatchEvent(new Event('load'));
			expect(active).not.toHaveBeenCalled();
			document.cookie = 'OPTIN=0; path=/';
			optOut?.dispatchEvent(new Event('load'));
			expect(active.mock.calls).toEqual([[['elqOptIn']]]);
			document.cookie = 'OPTIN=1; path=/';
			Array.from(document.querySelectorAll('script[src*="pps=41"]'))
				.at(-1)
				?.dispatchEvent(new Event('load'));
			// A repeated stale event must not alter the current grant.
			optOut?.dispatchEvent(new Event('load'));
			updateScripts(scripts, consents);
			expect(document.cookie).toContain('OPTIN=1');
			expect(retired.mock.calls).toEqual([
				[['elqOptIn']],
				[['elqTrackPageView', window.location.href]],
				[['elqOptOut']],
			]);
			expect(active.mock.calls).toEqual([
				[['elqOptIn']],
				[['elqTrackPageView', window.location.href]],
			]);
		}
	);
	it('coalesces pending choices across helper recreation without duplicate tracking', () => {
		const create = () => eloquaTracking({ siteId: '1973398186' });
		loadScripts([create()], granted);
		const loader = getLoader();
		const push = installDispatcher();
		const dispatcher = window._elqQ;
		loader.dispatchEvent(new Event('load'));
		const stale = document.querySelector('script[src*="pps=41"]');
		updateScripts([create()], unrelated);
		updateScripts([create()], granted);
		updateScripts([create()], { ...granted, measurement: true });
		const responses = document.querySelectorAll('script[src*="pps=41"]');
		expect(responses).toHaveLength(1);
		stale?.dispatchEvent(new Event('load'));
		stale?.dispatchEvent(new Event('load'));
		expect(push.mock.calls).toEqual([
			[['elqOptIn']],
			[['elqTrackPageView', window.location.href]],
		]);
		expect(window._elqQ).toBe(dispatcher);
		expect(getLoader()).toBe(loader);
	});
	it('waits for opt-in response, preserves the dispatcher, and deduplicates regrant', () => {
		const scripts = [
			eloquaTracking({
				firstPartyCookieDomain: 'tracking.example.com',
				siteId: '1973398186',
			}),
		];
		loadScripts(scripts, granted);
		expect(window._elqQ).toEqual([
			['elqSetSiteId', '1973398186'],
			['elqUseFirstPartyCookie', 'tracking.example.com'],
		]);
		const loader = getLoader();
		const push = installDispatcher();
		const dispatcher = window._elqQ;
		loader.dispatchEvent(new Event('load'));
		expect(push.mock.calls).toEqual([[['elqOptIn']]]);
		document
			.querySelector('script[src*="pps=41"]')
			?.dispatchEvent(new Event('load'));
		expect(push.mock.calls.at(-1)).toEqual([
			['elqTrackPageView', window.location.href],
		]);
		updateScripts(scripts, granted);
		expect(push).toHaveBeenCalledTimes(2);
		updateScripts(scripts, deniedConsents);
		expect(push.mock.calls.at(-1)).toEqual([['elqOptOut']]);
		document
			.querySelector('script[src*="pps=42"]')
			?.dispatchEvent(new Event('load'));
		updateScripts(scripts, granted);
		expect(window._elqQ).toBe(dispatcher);
		expect(getLoader()).toBe(loader);
		Array.from(document.querySelectorAll('script[src*="pps=41"]'))
			.at(-1)
			?.dispatchEvent(new Event('load'));
		expect(
			push.mock.calls.filter(([command]) => command[0] === 'elqTrackPageView')
		).toHaveLength(2);
	});
	it('ignores a late opt-in response and an in-flight loader after withdrawal', () => {
		const scripts = [eloquaTracking({ siteId: '1973398186' })];
		loadScripts(scripts, granted);
		const loader = getLoader();
		const push = installDispatcher();
		loader.dispatchEvent(new Event('load'));
		const response = document.querySelector('script[src*="pps=41"]');
		updateScripts(scripts, deniedConsents);
		response?.dispatchEvent(new Event('load'));
		expect(push.mock.calls).not.toContainEqual([
			['elqTrackPageView', window.location.href],
		]);
		loader.dispatchEvent(new Event('load'));
		expect(
			push.mock.calls.filter(([command]) => command[0] === 'elqOptIn')
		).toHaveLength(1);
	});
	it('does not opt in when revoked before the SDK finishes loading', () => {
		const create = () => eloquaTracking({ siteId: '1973398186' });
		loadScripts([create()], granted);
		const loader = getLoader();
		updateScripts([create()], deniedConsents);
		const push = installDispatcher();
		loader.dispatchEvent(new Event('load'));
		expect(push.mock.calls).toEqual([[['elqOptOut']]]);
	});
	it('discards a pending opt-in response on disposal', () => {
		loadScripts([eloquaTracking({ siteId: '1973398186' })], granted);
		const push = installDispatcher();
		getLoader().dispatchEvent(new Event('load'));
		const response = document.querySelector('script[src*="pps=41"]');
		clearAllScripts();
		response?.dispatchEvent(new Event('load'));
		expect(push).not.toHaveBeenCalledWith([
			'elqTrackPageView',
			window.location.href,
		]);
	});
	it('configures a fresh SDK after provider disposal and remount', () => {
		const responses: HTMLScriptElement[] = [];
		installHeadProbe((element) => {
			if (!element.src.endsWith('/elqCfg.min.js')) {
				return;
			}
			const commands: unknown[] = Array.isArray(window._elqQ)
				? window._elqQ
				: [];
			const configured = commands.some(
				(command) =>
					Array.isArray(command) &&
					command[0] === 'elqSetSiteId' &&
					command[1] === '1973398186'
			);
			window._elqQ = {
				push(command) {
					if (configured && command[0] === 'elqOptIn') {
						const response = document.createElement('script');
						response.src =
							'https://s1973398186.t.eloqua.com/visitor/v200/svrGP?pps=41&siteid=1973398186';
						document.head.append(response);
						responses.push(response);
					}
				},
			};
			element.dispatchEvent(new Event('load'));
		});
		const create = () => eloquaTracking({ siteId: '1973398186' });
		loadScripts([create()], granted);
		expect(responses).toHaveLength(1);
		clearAllScripts();
		loadScripts([create()], granted);
		expect(responses).toHaveLength(1);
		responses[0]?.dispatchEvent(new Event('load'));
		expect(responses).toHaveLength(2);
		responses[1]?.dispatchEvent(new Event('load'));
	});
});
