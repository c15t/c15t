/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	deniedConsents,
	loadScripts,
	registerVendorContractCleanup,
	updateScripts,
} from './e2e-test-utils';
import { marketoMunchkin } from './vendors/analytics/marketo';

const GLOBALS = [
	'Munchkin',
	'MunchkinTracker',
	'mktoMunchkin',
	'mktoMunchkinFunction',
] as const;
const granted = { ...deniedConsents, marketing: true };
const unrelated = { ...deniedConsents, measurement: true };
const getLoader = (): HTMLScriptElement => {
	const loader = document.querySelector<HTMLScriptElement>('script[src]');
	if (!loader) {
		throw new Error('Expected Marketo Munchkin loader');
	}
	return loader;
};

describe('Marketo Munchkin consent loader', () => {
	registerVendorContractCleanup();
	afterEach(() => {
		for (const name of GLOBALS) {
			Reflect.deleteProperty(window, name);
		}
		localStorage.clear();
		sessionStorage.clear();
	});
	it('creates no vendor requests, globals or storage before mapped consent', () => {
		const scripts = [marketoMunchkin({ munchkinId: 'AAA-BBB-CCC' })];
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
		expect(first.src).toBe('https://munchkin.marketo.net/munchkin.js');
		updateScripts(scripts, granted);
		expect(getLoader()).toBe(first);
		updateScripts(scripts, deniedConsents);
		expect(first.isConnected).toBe(false);
		updateScripts(scripts, granted);
		expect(getLoader()).not.toBe(first);
		expect(document.querySelectorAll('script[src]')).toHaveLength(1);
	});
	it('honors an overridden category', () => {
		const scripts = [
			marketoMunchkin({ category: 'experience', munchkinId: 'AAA-BBB-CCC' }),
		];
		loadScripts(scripts, granted);
		expect(document.querySelector('script[src]')).toBeNull();
		updateScripts(scripts, { ...deniedConsents, experience: true });
		expect(getLoader()).toBeDefined();
	});
});

describe('Marketo SDK initialization', () => {
	registerVendorContractCleanup();
	afterEach(() => {
		delete window.Munchkin;
	});
	it('initializes once after SDK load and skips a revoked in-flight load', () => {
		const init = vi.fn();
		const scripts = [
			marketoMunchkin({
				initOptions: { cookieAnon: false },
				munchkinId: ' AAA-BBB-CCC ',
			}),
		];
		loadScripts(scripts, granted);
		window.Munchkin = { init };
		const revoked = getLoader();
		expect(init).not.toHaveBeenCalled();
		updateScripts(scripts, deniedConsents);
		revoked.dispatchEvent(new Event('load'));
		expect(init).not.toHaveBeenCalled();
		updateScripts(scripts, granted);
		getLoader().dispatchEvent(new Event('load'));
		updateScripts(scripts, granted);
		expect(init).toHaveBeenCalledExactlyOnceWith('AAA-BBB-CCC', {
			cookieAnon: false,
		});
	});
});
