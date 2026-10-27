/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	clearAllScripts,
	deniedConsents,
	loadScripts,
	registerVendorContractCleanup,
	updateScripts,
} from './e2e-test-utils';
import { attentiveTag } from './vendors/email-and-sms/attentive';

const GLOBALS = ['attentive', 'attentiveOptions'];
const granted = { ...deniedConsents, marketing: true };
const unrelated = { ...deniedConsents, measurement: true };
const getLoader = (): HTMLScriptElement => {
	const loader = document.querySelector<HTMLScriptElement>('script[src]');
	if (!loader) {
		throw new Error('Expected Attentive loader');
	}
	return loader;
};

describe('Attentive consent loader', () => {
	registerVendorContractCleanup();
	// Node 25+ replaces jsdom's storage globals with its own.
	beforeEach(() => {
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
		const scripts = [attentiveTag({ siteSlug: 'c15tfake' })];
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
		expect(first.src).toBe('https://cdn.attn.tv/c15tfake/dtag.js');
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
			attentiveTag({ category: 'experience', siteSlug: 'c15tfake' }),
		];
		loadScripts(scripts, granted);
		expect(document.querySelector('script[src]')).toBeNull();
		updateScripts(scripts, { ...deniedConsents, experience: true });
		expect(getLoader()).toBeDefined();
	});
});

describe('Attentive body tag lifecycle', () => {
	registerVendorContractCleanup();
	it('retains the validated configuration across caller mutation and remount', () => {
		const options = { siteSlug: ' c15t-test_site-123 ' };
		const script = attentiveTag(options);
		options.siteSlug = 'invalid/path';
		loadScripts([script], deniedConsents);
		expect(document.querySelector('script[src]')).toBeNull();
		updateScripts([script], granted);
		expect(getLoader().src).toBe(
			'https://cdn.attn.tv/c15t-test_site-123/dtag.js'
		);
		clearAllScripts();
		loadScripts([script], granted);
		expect(getLoader().src).toBe(
			'https://cdn.attn.tv/c15t-test_site-123/dtag.js'
		);
		expect(document.querySelectorAll('script[src]')).toHaveLength(1);
	});
	it('uses one body tag across pending withdrawal and helper recreation', () => {
		const create = () => attentiveTag({ siteSlug: 'c15tfake' });
		loadScripts([create()], granted);
		const loader = getLoader();
		expect(loader.parentElement).toBe(document.body);
		updateScripts([create()], deniedConsents);
		loader.dispatchEvent(new Event('load'));
		updateScripts([create()], granted);
		expect(getLoader()).toBe(loader);
		expect(document.querySelectorAll('script[src]')).toHaveLength(1);
		expect(
			document.querySelector('script[src*="dtag.js"]')?.getAttribute('src')
		).toBe('https://cdn.attn.tv/c15tfake/dtag.js');
	});
});
