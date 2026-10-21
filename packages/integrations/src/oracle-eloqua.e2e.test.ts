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
import { eloquaTracking } from './vendors/analytics/oracle-eloqua';

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
		delete window._elqQ;
	});
	const installDispatcher = () => {
		const push = vi.fn((command: unknown[]) => {
			if (command[0] === 'elqOptIn') {
				const response = document.createElement('script');
				response.src =
					'https://s1973398186.t.eloqua.com/visitor/v200/svrGP?pps=41&siteid=1973398186';
				document.head.append(response);
			}
		});
		window._elqQ = { push };
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
				void kernel.commands.save(granted);
				Array.from(document.querySelectorAll('script[src*="pps=41"]'))
					.at(-1)
					?.dispatchEvent(new Event('load'));
				expect(push.mock.calls).toEqual([
					[['elqOptIn']],
					[['elqTrackPageView']],
					[['elqOptOut']],
					[['elqOptIn']],
					[['elqTrackPageView']],
				]);
				expect(getLoader()).toBe(loader);
			} finally {
				second.dispose();
				first.dispose();
				kernel.dispose();
			}
		}
	);
	it('keeps the current grant across helper recreation and ignores stale responses', () => {
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
		expect(responses).toHaveLength(2);
		stale?.dispatchEvent(new Event('load'));
		expect(push).not.toHaveBeenCalledWith(['elqTrackPageView']);
		responses[1]?.dispatchEvent(new Event('load'));
		expect(push.mock.calls).toEqual([
			[['elqOptIn']],
			[['elqOptOut']],
			[['elqOptIn']],
			[['elqTrackPageView']],
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
		expect(push.mock.calls.at(-1)).toEqual([['elqTrackPageView']]);
		updateScripts(scripts, granted);
		expect(push).toHaveBeenCalledTimes(2);
		updateScripts(scripts, deniedConsents);
		expect(push.mock.calls.at(-1)).toEqual([['elqOptOut']]);
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
		expect(push.mock.calls).not.toContainEqual([['elqTrackPageView']]);
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
		expect(push).not.toHaveBeenCalled();
	});
	it('discards a pending opt-in response on disposal', () => {
		loadScripts([eloquaTracking({ siteId: '1973398186' })], granted);
		const push = installDispatcher();
		getLoader().dispatchEvent(new Event('load'));
		const response = document.querySelector('script[src*="pps=41"]');
		clearAllScripts();
		response?.dispatchEvent(new Event('load'));
		expect(push).not.toHaveBeenCalledWith(['elqTrackPageView']);
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
		expect(responses).toHaveLength(2);
	});
});
