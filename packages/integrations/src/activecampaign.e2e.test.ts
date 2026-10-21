/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	deniedConsents,
	loadScripts,
	registerVendorContractCleanup,
	updateScripts,
} from './e2e-test-utils';
import { activeCampaignTracking } from './vendors/email-and-sms/activecampaign';

const GLOBALS = ['pgo', 'prismGlobalObjectAlias'];
const granted = { ...deniedConsents, marketing: true };
const unrelated = { ...deniedConsents, measurement: true };
const getLoader = (): HTMLScriptElement => {
	const loader = document.querySelector<HTMLScriptElement>('script[src]');
	if (!loader) {
		throw new Error('Expected ActiveCampaign loader');
	}
	return loader;
};

describe('ActiveCampaign consent loader', () => {
	registerVendorContractCleanup();
	afterEach(() => {
		for (const name of GLOBALS) {
			Reflect.deleteProperty(window, name);
		}
		localStorage.clear();
		sessionStorage.clear();
	});
	it('creates no vendor requests, globals or storage before mapped consent', () => {
		const scripts = [activeCampaignTracking({ accountId: '123456' })];
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
		expect(first.src).toBe('https://prism.app-us1.com/prism.js');
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
			activeCampaignTracking({ accountId: '123456', category: 'experience' }),
		];
		loadScripts(scripts, granted);
		expect(document.querySelector('script[src]')).toBeNull();
		updateScripts(scripts, { ...deniedConsents, experience: true });
		expect(getLoader()).toBeDefined();
	});
});

describe('ActiveCampaign tracking lifecycle', () => {
	registerVendorContractCleanup();
	afterEach(() => {
		delete window.pgo;
		delete window.prismGlobalObjectAlias;
	});
	it('starts disabled and sends one allowTracking call after load and regrant', () => {
		const scripts = [
			activeCampaignTracking({
				accountId: '123456',
				email: ' person@example.com ',
			}),
		];
		loadScripts(scripts, granted);
		expect(window.pgo?.q?.map((args) => Array.from(args))).toEqual([
			['setAccount', '123456'],
			['setTrackByDefault', false],
		]);
		expect(window.pgo?.l).toEqual(expect.any(Number));
		const loader = getLoader();
		const pgo = vi.fn();
		window.pgo = pgo;
		loader.dispatchEvent(new Event('load'));
		expect(pgo.mock.calls).toEqual([
			['setEmail', 'person@example.com'],
			['process', 'allowTracking'],
		]);
		updateScripts(scripts, granted);
		expect(pgo).toHaveBeenCalledTimes(2);
		updateScripts(scripts, deniedConsents);
		expect(pgo.mock.calls.at(-1)).toEqual(['setTrackByDefault', false]);
		updateScripts(scripts, granted);
		expect(getLoader()).toBe(loader);
		expect(pgo.mock.calls.filter(([name]) => name === 'process')).toEqual([
			['process', 'allowTracking'],
			['process', 'allowTracking'],
		]);
	});
	it('never enables a download completed after withdrawal', () => {
		const scripts = [
			activeCampaignTracking({
				accountId: '123456',
				email: 'person@example.com',
			}),
		];
		loadScripts(scripts, granted);
		const loader = getLoader();
		updateScripts(scripts, deniedConsents);
		const pgo = vi.fn();
		window.pgo = pgo;
		loader.dispatchEvent(new Event('load'));
		expect(pgo).not.toHaveBeenCalled();
	});
});

describe('ActiveCampaign helper recreation', () => {
	registerVendorContractCleanup();
	afterEach(() => {
		delete window.pgo;
		delete window.prismGlobalObjectAlias;
	});
	it('retains lifecycle state when the helper is called again', () => {
		const create = () =>
			activeCampaignTracking({ accountId: 'recreated-account' });
		const scripts = [create()];
		loadScripts(scripts, granted);
		const pgo = vi.fn();
		window.pgo = pgo;
		getLoader().dispatchEvent(new Event('load'));
		updateScripts([create()], deniedConsents);
		updateScripts([create()], granted);
		expect(pgo.mock.calls.filter(([name]) => name === 'process')).toEqual([
			['process', 'allowTracking'],
			['process', 'allowTracking'],
		]);
		expect(document.querySelectorAll('script[src]')).toHaveLength(1);
	});
});
