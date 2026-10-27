/**
 * @vitest-environment jsdom
 */

import { createConsentKernel } from '@c15t/core';
import { createScriptLoader } from '@c15t/core/modules/script-loader';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	deniedConsents,
	grantedMarketingConsents,
	installHeadProbe,
	loadScripts,
	registerVendorContractCleanup,
	updateScripts,
} from './e2e-test-utils';
import { wisepops } from './vendors/functional/wisepops';

const LOADER_SRC = 'https://wisepops.net/loader.js?v=3&h=c15tfake';

const getLoader = function getLoader(): HTMLScriptElement {
	const element = document.head.querySelector<HTMLScriptElement>(
		'script[src="https://wisepops.net/loader.js?v=3&h=c15tfake"]'
	);
	if (!element) {
		throw new Error('Expected a Wisepops loader.');
	}
	return element;
};

// Behavioral test double for the documented options and grant-only API.
// It is not a Wisepops loader body or evidence of the real SDK's behavior.
const installWisepopsTestDouble = function installWisepopsTestDouble() {
	const calls: unknown[][] = [];
	const runtime = vi.fn((...args: unknown[]) => {
		calls.push(args);
	});
	installHeadProbe((element) => {
		if (element.src !== LOADER_SRC) {
			return;
		}
		const queued = window.wisepops?.q;
		if (!queued) {
			throw new Error('Expected the official Wisepops queue shape.');
		}
		for (const entry of queued) {
			runtime(...Array.from(entry));
		}
		queued.length = 0;
		queued.push = (...entries: IArguments[]) => {
			for (const entry of entries) {
				runtime(...Array.from(entry));
			}
			return 0;
		};
	});
	return { calls, runtime };
};

describe('Wisepops loader contract', () => {
	registerVendorContractCleanup();
	afterEach(() => {
		delete window.wisepops;
	});

	it('waits for marketing consent before globals, storage or loader insertion', () => {
		const { cookie } = document;
		const localStorageBefore = { ...localStorage };
		const sessionStorageBefore = { ...sessionStorage };
		const append = installHeadProbe(() => undefined);
		const scripts = [wisepops({ siteId: 'c15tfake' })];

		loadScripts(scripts, deniedConsents);
		updateScripts(scripts, { ...deniedConsents, measurement: true });
		expect(append).not.toHaveBeenCalled();
		expect(window.wisepops).toBeUndefined();
		// oxlint-disable-next-line unicorn/no-document-cookie -- Checks that denied setup leaves cookies unchanged.
		expect(document.cookie).toBe(cookie);
		expect({ ...localStorage }).toEqual(localStorageBefore);
		expect({ ...sessionStorage }).toEqual(sessionStorageBefore);

		updateScripts(scripts, grantedMarketingConsents);
		expect(getLoader().src).toBe(LOADER_SRC);
		expect(getLoader().defer).toBe(true);
		expect(typeof window.wisepops).toBe('function');
		updateScripts(scripts, grantedMarketingConsents);
		expect(append).toHaveBeenCalledOnce();
	});

	it('sets denied cookie consent before append and grants only after SDK load', () => {
		const { calls, runtime } = installWisepopsTestDouble();
		const scripts = [
			wisepops({
				options: { autoPageview: false, browserStorage: true },
				siteId: 'c15tfake',
			}),
		];
		loadScripts(scripts, grantedMarketingConsents);
		expect(calls).toEqual([
			[
				'options',
				{
					autoPageview: false,
					browserStorage: true,
					defaultConsent: 'denied',
				},
			],
		]);

		getLoader().dispatchEvent(new Event('load'));
		updateScripts(scripts, grantedMarketingConsents);
		getLoader().dispatchEvent(new Event('load'));
		expect(runtime).toHaveBeenCalledTimes(2);
		expect(calls.at(-1)).toEqual(['consent', 'granted']);
	});

	it('detaches on revocation without sending an unsupported denial or removing the runtime', () => {
		const { calls } = installWisepopsTestDouble();
		const scripts = [wisepops({ siteId: 'c15tfake' })];
		loadScripts(scripts, grantedMarketingConsents);
		const element = getLoader();
		const snippet = window.wisepops;
		element.dispatchEvent(new Event('load'));

		const result = updateScripts(scripts, deniedConsents);

		expect(result.unloaded).toEqual(['wisepops']);
		expect(element.isConnected).toBe(false);
		expect(calls).toEqual([
			['options', { defaultConsent: 'denied' }],
			['consent', 'granted'],
		]);
		expect(window.wisepops).toBe(snippet);
	});

	it('does not grant on a detached in-flight load', () => {
		const { calls } = installWisepopsTestDouble();
		const scripts = [wisepops({ siteId: 'c15tfake' })];
		loadScripts(scripts, grantedMarketingConsents);
		const revoked = getLoader();
		updateScripts(scripts, deniedConsents);
		revoked.dispatchEvent(new Event('load'));
		expect(calls).toEqual([['options', { defaultConsent: 'denied' }]]);
	});

	it('uses the category override and core-supplied CSP nonce', () => {
		const scripts = [wisepops({ category: 'experience', siteId: 'c15tfake' })];
		loadScripts(scripts, grantedMarketingConsents, { nonce: 'provider-nonce' });
		expect(window.wisepops).toBeUndefined();
		updateScripts(scripts, { ...deniedConsents, experience: true });
		expect(getLoader().nonce).toBe('provider-nonce');
	});

	it('honors the Wisepops vendor switch inside an allowed category', async () => {
		const kernel = createConsentKernel();
		const loader = createScriptLoader({
			kernel,
			scripts: [wisepops({ siteId: 'c15tfake' })],
		});
		try {
			await kernel.commands.save(
				{ marketing: true },
				{ vendors: { wisepops: false } }
			);
			expect(window.wisepops).toBeUndefined();
			expect(document.head.querySelector('script')).toBeNull();

			await kernel.commands.save(
				{ marketing: true },
				{ vendors: { wisepops: true } }
			);
			expect(getLoader().src).toBe(LOADER_SRC);

			await kernel.commands.save(
				{ marketing: true },
				{ vendors: { wisepops: false } }
			);
			expect(document.head.querySelector('script')).toBeNull();
		} finally {
			loader.dispose();
			kernel.dispose();
		}
	});

	it('regrants after a completed load without replacing the SDK queue', async () => {
		const { calls } = installWisepopsTestDouble();
		const kernel = createConsentKernel();
		const script = wisepops({ siteId: 'c15tfake' });
		const loader = createScriptLoader({ kernel, scripts: [script] });
		try {
			await kernel.commands.save({ marketing: true });
			const first = getLoader();
			const snippet = window.wisepops;
			const queue = snippet?.q;
			const timestamp = snippet?.l;
			first.dispatchEvent(new Event('load'));
			await kernel.commands.save({ marketing: false });
			expect(first.isConnected).toBe(false);

			// Framework rerenders can recreate a helper before the next grant.
			loader.updateScripts([wisepops({ siteId: 'c15tfake' })]);
			await kernel.commands.save({ marketing: true });
			const second = getLoader();
			expect(second).not.toBe(first);
			expect(window.wisepops).toBe(snippet);
			expect(window.wisepops?.q).toBe(queue);
			expect(window.wisepops?.l).toBe(timestamp);
			second.dispatchEvent(new Event('load'));
			loader.updateScripts([wisepops({ siteId: 'c15tfake' })]);
			await kernel.commands.save({ marketing: true, measurement: true });

			expect(document.head.querySelectorAll('script')).toHaveLength(1);
			expect(calls).toEqual([
				['options', { defaultConsent: 'denied' }],
				['consent', 'granted'],
				['options', { defaultConsent: 'denied' }],
				['consent', 'granted'],
			]);
		} finally {
			loader.dispose();
			kernel.dispose();
		}
	});

	it('ignores the revoked in-flight loader after regrant and grants the new load', async () => {
		const { calls } = installWisepopsTestDouble();
		const kernel = createConsentKernel();
		const loader = createScriptLoader({
			kernel,
			scripts: [wisepops({ siteId: 'c15tfake' })],
		});
		try {
			await kernel.commands.save({ marketing: true });
			const stale = getLoader();
			await kernel.commands.save({ marketing: false });
			await kernel.commands.save({ marketing: true });
			const current = getLoader();
			stale.dispatchEvent(new Event('load'));
			expect(calls.every(([command]) => command === 'options')).toBe(true);
			current.dispatchEvent(new Event('load'));
			current.dispatchEvent(new Event('load'));
			expect(calls).toEqual([
				['options', { defaultConsent: 'denied' }],
				['options', { defaultConsent: 'denied' }],
				['consent', 'granted'],
			]);
		} finally {
			loader.dispose();
			kernel.dispose();
		}
	});

	it('requires every category in a custom consent condition', async () => {
		const append = installHeadProbe(() => undefined);
		const kernel = createConsentKernel();
		const loader = createScriptLoader({
			kernel,
			scripts: [
				wisepops({
					category: { and: ['marketing', 'experience'] },
					siteId: 'c15tfake',
				}),
			],
		});
		try {
			await kernel.commands.save({ marketing: true });
			expect(append).not.toHaveBeenCalled();
			expect(window.wisepops).toBeUndefined();
			await kernel.commands.save({ experience: true, marketing: true });
			expect(append).toHaveBeenCalledOnce();
			await kernel.commands.save({ experience: true, marketing: false });
			expect(document.head.querySelector('script')).toBeNull();
		} finally {
			loader.dispose();
			kernel.dispose();
		}
	});

	it('skips a missing ID even when core grants its category', async () => {
		const error = vi
			.spyOn(console, 'error')
			.mockImplementation(() => undefined);
		const append = installHeadProbe(() => undefined);
		const kernel = createConsentKernel();
		const loader = createScriptLoader({
			kernel,
			scripts: [wisepops({ siteId: ' ' })],
		});
		try {
			await kernel.commands.save({ marketing: true });
			expect(error).toHaveBeenCalledExactlyOnceWith(
				'wisepops: missing or invalid siteId. The script will not load.'
			);
			expect(append).not.toHaveBeenCalled();
			expect(window.wisepops).toBeUndefined();
		} finally {
			loader.dispose();
			kernel.dispose();
		}
	});

	it('keeps the encoded public site ID inside the official loader URL', async () => {
		const append = installHeadProbe(() => undefined);
		const kernel = createConsentKernel();
		const loader = createScriptLoader({
			kernel,
			scripts: [wisepops({ siteId: '  account/&?#+ %  ' })],
		});
		try {
			await kernel.commands.save({ marketing: true });
			const element = document.head.querySelector('script');
			expect(element?.src).toBe(
				'https://wisepops.net/loader.js?v=3&h=account%2F%26%3F%23%2B%20%25'
			);
			const url = new URL(element?.src ?? '');
			expect(url.origin).toBe('https://wisepops.net');
			expect(url.searchParams.get('h')).toBe('account/&?#+ %');
			expect([...url.searchParams.keys()]).toEqual(['v', 'h']);
			expect(append).toHaveBeenCalledOnce();
		} finally {
			loader.dispose();
			kernel.dispose();
		}
	});
});
