/** @vitest-environment jsdom */
import { createConsentKernel } from '@c15t/core';
import { createScriptLoader } from '@c15t/core/modules/script-loader';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	clearAllScripts,
	deniedConsents,
	installHeadProbe,
	loadScripts,
	registerVendorContractCleanup,
	updateScripts,
} from './e2e-test-utils';
import { pardotTracking } from './vendors/analytics/salesforce-pardot';

const GLOBALS = ['piAId', 'piCId', 'piHostname', 'piDomain', 'pdt'];
const granted = { ...deniedConsents, marketing: true };
const unrelated = { ...deniedConsents, measurement: true };
const getLoader = (): HTMLScriptElement => {
	const loader = document.querySelector<HTMLScriptElement>('script[src]');
	if (!loader) {
		throw new Error('Expected Salesforce Account Engagement loader');
	}
	return loader;
};

const executeSdk = (element: HTMLScriptElement, pageView: () => void): void => {
	const queued = window.pdt?.cq ?? [];
	let configured = false;
	let optedIn = false;
	window.pdt = (command, value) => {
		if (typeof command === 'function') {
			command();
		} else if (command === 'create') {
			configured = true;
		} else if (command === 'setOptIn') {
			optedIn = value === true;
		} else if (command === 'revokeConsent') {
			optedIn = false;
		} else if (command === 'sendPageView' && configured && optedIn) {
			pageView();
		}
	};
	for (const args of queued) {
		window.pdt(...Array.from(args));
	}
	element.dispatchEvent(new Event('load'));
};

describe('Salesforce Account Engagement consent loader', () => {
	registerVendorContractCleanup();
	afterEach(() => {
		for (const name of GLOBALS) {
			Reflect.deleteProperty(window, name);
		}
		localStorage.clear();
		sessionStorage.clear();
	});
	it('creates no vendor requests, globals or storage before mapped consent', () => {
		const scripts = [
			pardotTracking({
				piAId: '123456',
				piCId: '654321',
				piDomain: 'pi.pardot.com',
			}),
		];
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
		expect(first.src).toBe('https://pi.pardot.com/pdt.js?aid=123456');
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
			pardotTracking({
				category: 'experience',
				piAId: '123456',
				piCId: '654321',
				piDomain: 'pi.pardot.com',
			}),
		];
		loadScripts(scripts, granted);
		expect(document.querySelector('script[src]')).toBeNull();
		updateScripts(scripts, { ...deniedConsents, experience: true });
		expect(getLoader()).toBeDefined();
	});
});

describe('Pardot consent API contract', () => {
	registerVendorContractCleanup();
	afterEach(() => {
		delete window.pdt;
		delete window.piAId;
		delete window.piCId;
		delete window.piDomain;
	});
	it('queues numeric configuration, then grants only after load; revoke preserves opt-out', () => {
		const scripts = [
			pardotTracking({
				piAId: '123456',
				piCId: '654321',
				piDomain: 'pi.pardot.com',
			}),
		];
		loadScripts(scripts, granted);
		expect(window.pdt?.cq?.map((args) => Array.from(args))).toEqual([
			['create', 123456, 654321, 'pi.pardot.com'],
			['hideConsentBanner', null],
			['setOptIn', false],
		]);
		const pdt = vi.fn();
		window.pdt = pdt;
		getLoader().dispatchEvent(new Event('load'));
		updateScripts(scripts, granted);
		expect(pdt.mock.calls).toEqual([['setOptIn', true], ['sendPageView']]);
		updateScripts(scripts, deniedConsents);
		expect(pdt.mock.calls.at(-1)).toEqual(['revokeConsent']);
		expect(pdt.mock.calls).not.toContainEqual(['clearTrackingCookies']);
		updateScripts(scripts, granted);
		expect(pdt.mock.calls.filter(([name]) => name === 'create')).toHaveLength(
			0
		);
		expect(
			pdt.mock.calls.filter(([name]) => name === 'sendPageView')
		).toHaveLength(2);
	});
	it('does not enable an in-flight download after withdrawal', () => {
		const scripts = [
			pardotTracking({
				piAId: '123456',
				piCId: '654321',
				piDomain: 'pi.pardot.com',
			}),
		];
		loadScripts(scripts, granted);
		const first = getLoader();
		updateScripts(scripts, deniedConsents);
		const pdt = vi.fn();
		window.pdt = pdt;
		first.dispatchEvent(new Event('load'));
		expect(pdt).not.toHaveBeenCalled();
	});
	it.each([false, true])(
		'waits for SDK readiness across in-flight withdrawal and regrant, loaded while denied: %s',
		(loadedWhileDenied) => {
			const create = () =>
				pardotTracking({
					piAId: '123456',
					piCId: '654321',
					piDomain: 'pi.pardot.com',
				});
			loadScripts([create()], granted);
			const element = getLoader();
			updateScripts([create()], deniedConsents);
			const pdt = vi.fn();
			window.pdt = pdt;
			if (loadedWhileDenied) {
				element.dispatchEvent(new Event('load'));
			}
			expect(pdt).not.toHaveBeenCalled();
			updateScripts([create()], granted);
			expect(pdt).toHaveBeenCalledTimes(loadedWhileDenied ? 2 : 0);
			if (!loadedWhileDenied) {
				element.dispatchEvent(new Event('load'));
			}
			expect(pdt.mock.calls).toEqual([['setOptIn', true], ['sendPageView']]);
			expect(getLoader()).toBe(element);
		}
	);
	it('reuses tracker configuration across helper recreation and regrant', () => {
		const create = () =>
			pardotTracking({
				piAId: '123456',
				piCId: '654321',
				piDomain: 'pi.pardot.com',
			});
		loadScripts([create()], granted);
		const pdt = vi.fn();
		window.pdt = pdt;
		getLoader().dispatchEvent(new Event('load'));
		updateScripts([create()], unrelated);
		updateScripts([create()], granted);
		updateScripts([create()], { ...granted, measurement: true });
		expect(pdt.mock.calls).toEqual([
			['setOptIn', true],
			['sendPageView'],
			['revokeConsent'],
			['setOptIn', true],
			['sendPageView'],
		]);
		expect(window.pdt).toBe(pdt);
		expect(document.scripts).toHaveLength(1);
	});
	it.each([
		{},
		{ category: 'marketing' as const },
		{ mode: 'consent' as const },
		{ piAId: 123456, piCId: 654321 },
		{ piAId: '0123456', piCId: '0654321' },
		{ piDomain: 'PI.PARDOT.COM' },
		{
			piAId: ' 123456 ',
			piCId: ' 654321 ',
			piDomain: ' pi.pardot.com ',
			piHostname: 'unused.pardot.com',
			scriptUrl: ' https://pi.pardot.com/pdt.js?aid=123456 ',
		},
	])(
		'sends one page view per grant for equivalent registrations, case %#',
		(overrides) => {
			const kernel = createConsentKernel();
			void kernel.commands.save(granted);
			const options = {
				piAId: '123456',
				piCId: '654321',
				piDomain: 'pi.pardot.com',
			};
			const first = createScriptLoader({
				kernel,
				scripts: [pardotTracking(options)],
			});
			const second = createScriptLoader({
				kernel,
				scripts: [pardotTracking({ ...options, ...overrides })],
			});
			try {
				const pdt = vi.fn();
				window.pdt = pdt;
				getLoader().dispatchEvent(new Event('load'));
				expect(document.scripts).toHaveLength(1);
				expect(pdt.mock.calls).toEqual([['setOptIn', true], ['sendPageView']]);
				void kernel.commands.save(deniedConsents);
				void kernel.commands.save(granted);
				expect(pdt.mock.calls).toEqual([
					['setOptIn', true],
					['sendPageView'],
					['revokeConsent'],
					['setOptIn', true],
					['sendPageView'],
				]);
			} finally {
				second.dispose();
				first.dispose();
				kernel.dispose();
			}
		}
	);
	it.each([
		[false, { category: 'marketing' as const }],
		[true, { category: 'marketing' as const }],
		[false, { piAId: '0123456' }],
		[true, { piAId: '0123456' }],
		[false, { piDomain: 'PI.PARDOT.COM' }],
		[true, { piDomain: 'PI.PARDOT.COM' }],
	] as const)(
		'keeps overlap recovery when an equivalent registration remains after bootstrap owner disposal, stale first: %s, options: %o',
		(staleFirst, overrides) => {
			const options = {
				piAId: '123456',
				piCId: '654321',
				piDomain: 'pi.pardot.com',
			};
			const create = () => pardotTracking(options);
			const pageView = vi.fn();
			loadScripts([create()], granted);
			const stale = getLoader();
			clearAllScripts();
			const kernel = createConsentKernel();
			void kernel.commands.save(granted);
			const first = createScriptLoader({ kernel, scripts: [create()] });
			const second = createScriptLoader({
				kernel,
				scripts: [pardotTracking({ ...options, ...overrides })],
			});
			try {
				const current = getLoader();
				executeSdk(staleFirst ? stale : current, pageView);
				first.dispose();
				executeSdk(staleFirst ? current : stale, pageView);
				expect(pageView).toHaveBeenCalledTimes(1);
				window.pdt?.('sendPageView');
				expect(pageView).toHaveBeenCalledTimes(2);
				void kernel.commands.save(deniedConsents);
				void kernel.commands.save(granted);
				expect(pageView).toHaveBeenCalledTimes(3);
			} finally {
				second.dispose();
				first.dispose();
				kernel.dispose();
			}
		}
	);
	it('keeps the configured dispatcher instead of executing the SDK again on regrant', () => {
		const pageView = vi.fn();
		const runSdk = vi.fn((element: HTMLScriptElement) =>
			executeSdk(element, pageView)
		);
		installHeadProbe(runSdk);
		const create = () =>
			pardotTracking({
				piAId: '123456',
				piCId: '654321',
				piDomain: 'pi.pardot.com',
			});
		loadScripts([create()], granted);
		expect(pageView).toHaveBeenCalledTimes(1);
		const dispatcher = window.pdt;
		updateScripts([create()], deniedConsents);
		updateScripts([create()], granted);
		expect(pageView).toHaveBeenCalledTimes(2);
		expect(runSdk).toHaveBeenCalledTimes(1);
		expect(window.pdt).toBe(dispatcher);
		clearAllScripts();
		loadScripts([create()], granted);
		expect(pageView).toHaveBeenCalledTimes(3);
		expect(runSdk).toHaveBeenCalledTimes(2);
		expect(window.pdt).not.toBe(dispatcher);
	});
	it.each([
		[false, false, false],
		[true, false, false],
		[false, true, false],
		[true, true, false],
		[false, false, true],
		[true, false, true],
	])(
		'keeps the tracker configured across overlapping disposal/remount downloads, stale first: %s, withdrawn: %s, new options: %s',
		(staleFirst, withdrawn, newOptions) => {
			const create = (newCampaign = false) =>
				pardotTracking({
					piAId: '123456',
					piCId: newCampaign ? '654322' : '654321',
					piDomain: 'pi.pardot.com',
				});
			const pageView = vi.fn();
			loadScripts([create()], granted);
			const stale = getLoader();
			clearAllScripts();
			const recreate = () => create(newOptions);
			loadScripts([recreate()], granted);
			const current = getLoader();
			expect(current).not.toBe(stale);
			const queuedCallback = vi.fn();
			window.pdt?.(queuedCallback);
			if (withdrawn) {
				updateScripts([recreate()], deniedConsents);
			}
			const expectedViews = withdrawn ? 0 : 1;
			executeSdk(staleFirst ? stale : current, pageView);
			expect(pageView).toHaveBeenCalledTimes(staleFirst ? 0 : expectedViews);
			executeSdk(staleFirst ? current : stale, pageView);
			expect(pageView).toHaveBeenCalledTimes(expectedViews);
			expect(queuedCallback).toHaveBeenCalledTimes(1);
			updateScripts([recreate()], deniedConsents);
			updateScripts([recreate()], granted);
			expect(pageView).toHaveBeenCalledTimes(expectedViews + 1);
		}
	);
	it('supports the classic snippet without a consent stub', () => {
		const scripts = [
			pardotTracking({ mode: 'classic', piAId: '123456', piCId: '654321' }),
		];
		loadScripts(scripts, deniedConsents);
		expect(window.piHostname).toBeUndefined();
		updateScripts(scripts, granted);
		expect(getLoader().src).toBe('https://pi.pardot.com/pd.js');
		expect(window.piHostname).toBe('pi.pardot.com');
		expect(window.pdt).toBeUndefined();
	});
});
