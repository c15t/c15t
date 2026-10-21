/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	deniedConsents,
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
		expect(first.src).toBe('https://pi.pardot.com/pdt.js?aid=123456');
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
		getLoader().dispatchEvent(new Event('load'));
		expect(pdt.mock.calls.filter(([name]) => name === 'create')).toHaveLength(
			0
		);
		expect(
			pdt.mock.calls.filter(([name]) => name === 'sendPageView')
		).toHaveLength(2);
	});
	it('does not enable a detached in-flight download', () => {
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
