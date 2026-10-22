/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	clearAllScripts,
	deniedConsents,
	loadScripts,
	registerVendorContractCleanup,
	updateScripts,
} from './e2e-test-utils';
import type { LuckyOrangeApi } from './vendors/analytics/lucky-orange';
import { luckyOrange } from './vendors/analytics/lucky-orange';

const GLOBALS = ['LOQ', 'LO'];
const granted = { ...deniedConsents, measurement: true };
const unrelated = { ...deniedConsents, marketing: true };
const getLoader = (): HTMLScriptElement => {
	const loader = document.querySelector<HTMLScriptElement>('script[src]');
	if (!loader) {
		throw new Error('Expected Lucky Orange loader');
	}
	return loader;
};

describe('Lucky Orange consent loader', () => {
	registerVendorContractCleanup();
	beforeEach(() => {
		// Node 25+ replaces jsdom's storage globals with its own Web Storage.
		vi.stubGlobal('localStorage', jsdom.window.localStorage);
		vi.stubGlobal('sessionStorage', jsdom.window.sessionStorage);
	});
	afterEach(() => {
		for (const name of GLOBALS) {
			Reflect.deleteProperty(window, name);
		}
		localStorage.clear();
		sessionStorage.clear();
		vi.unstubAllGlobals();
	});
	it('creates no vendor requests, globals or storage before mapped consent', () => {
		const scripts = [luckyOrange({ siteId: 'YOUR_SITE_ID' })];
		const cookies = document.cookie;
		const local = { ...localStorage };
		const session = { ...sessionStorage };
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
		updateScripts(scripts, granted);
		const first = getLoader();
		expect(first.src).toBe(
			'https://tools.luckyorange.com/core/lo.js?site-id=YOUR_SITE_ID'
		);
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
			luckyOrange({ category: 'experience', siteId: 'YOUR_SITE_ID' }),
		];
		loadScripts(scripts, granted);
		expect(document.querySelector('script[src]')).toBeNull();
		updateScripts(scripts, { ...deniedConsents, experience: true });
		expect(getLoader()).toBeDefined();
	});
});

describe('Lucky Orange privacy readiness', () => {
	registerVendorContractCleanup();
	afterEach(() => {
		delete window.LOQ;
		delete window.LO;
	});
	it.each([false, true])(
		'reports rejected privacy readiness without granting consent, disposed: %s',
		async (dispose) => {
			const error = new Error('Privacy initialization failed');
			const report = vi.spyOn(console, 'error').mockImplementation(() => {});
			const scripts = [luckyOrange({ siteId: 'failed-privacy-site' })];
			loadScripts(scripts, granted);
			const queue = window.LOQ;
			if (!Array.isArray(queue) || !queue[0]) {
				throw new Error('Expected Lucky Orange ready callback');
			}
			const api = {
				$internal: { ready: vi.fn().mockRejectedValue(error) },
				privacy: { setConsentStatus: vi.fn() },
			};
			queue[0][1](api);
			if (dispose) {
				clearAllScripts();
			}
			await new Promise((resolve) => {
				setTimeout(resolve, 0);
			});
			expect(report).toHaveBeenCalledExactlyOnceWith(
				'luckyOrange: privacy initialization failed.',
				error
			);
			expect(api.$internal.ready).toHaveBeenCalledWith('privacy');
			if (!dispose) {
				updateScripts(scripts, deniedConsents);
				updateScripts(scripts, granted);
			}
			expect(api.privacy.setConsentStatus).not.toHaveBeenCalled();
		}
	);
	it('waits for privacy and uses the latest consent across helper recreation', async () => {
		const create = () => luckyOrange({ siteId: 'privacy-site' });
		const scripts = [create()];
		loadScripts(scripts, granted);
		const queue = window.LOQ;
		if (!Array.isArray(queue)) {
			throw new Error('Expected LOQ array');
		}
		const entry = queue[0] as ['ready', (api: LuckyOrangeApi) => void];
		let resolvePrivacy: (value: unknown) => void = () => {
			throw new Error('Privacy not pending');
		};
		const privacyReady = new Promise<unknown>((resolve) => {
			resolvePrivacy = resolve;
		});
		const api = {
			$internal: { ready: vi.fn(() => privacyReady) },
			privacy: { setConsentStatus: vi.fn() },
		};
		entry[1](api);
		expect(api.$internal.ready).toHaveBeenCalledWith('privacy');
		updateScripts([create()], deniedConsents);
		expect(api.privacy.setConsentStatus).not.toHaveBeenCalled();
		resolvePrivacy(undefined);
		await privacyReady;
		await Promise.resolve();
		expect(api.privacy.setConsentStatus.mock.calls).toEqual([[false]]);
		updateScripts([create()], granted);
		updateScripts([create()], granted);
		expect(api.privacy.setConsentStatus.mock.calls).toEqual([[false], [true]]);
		updateScripts([create()], deniedConsents);
		expect(api.privacy.setConsentStatus.mock.calls).toEqual([
			[false],
			[true],
			[false],
		]);
		expect(queue).toHaveLength(1);
		expect(document.querySelectorAll('script[src]')).toHaveLength(1);
	});
	it('does not grant when the ready callback arrives after withdrawal', async () => {
		const scripts = [luckyOrange({ siteId: 'late-site' })];
		loadScripts(scripts, granted);
		const queue = window.LOQ;
		if (!Array.isArray(queue)) {
			throw new Error('Expected LOQ');
		}
		updateScripts(scripts, deniedConsents);
		const api = {
			$internal: { ready: vi.fn().mockResolvedValue(undefined) },
			privacy: { setConsentStatus: vi.fn() },
		};
		const entry = queue[0] as ['ready', (api: LuckyOrangeApi) => void];
		entry[1](api);
		await Promise.resolve();
		await Promise.resolve();
		expect(api.privacy.setConsentStatus.mock.calls).toEqual([[false]]);
	});
});
