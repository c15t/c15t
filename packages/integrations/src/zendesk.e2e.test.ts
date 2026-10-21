/**
 * @vitest-environment jsdom
 */

import { createConsentKernel } from '@c15t/core';
import { createScriptLoader } from '@c15t/core/modules/script-loader';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	deniedConsents,
	installHeadProbe,
	loadScripts,
	registerVendorContractCleanup,
	isArgumentsPayload,
	toArgs,
	updateScripts,
} from './e2e-test-utils';
import { zendeskWidget } from './vendors/functional/zendesk';

const functionalityConsents = { ...deniedConsents, functionality: true };
const allWidgetConsents = { ...functionalityConsents, measurement: true };

const getLoader = function getLoader(): HTMLScriptElement {
	const loader = document.head.querySelector('script');
	if (!loader) {
		throw new Error('Expected a Zendesk Messaging loader.');
	}
	return loader;
};

// Vendor commands are synthetic. These tests exercise the production core
// loader and helper lifecycle, without running the Zendesk runtime.
describe('Zendesk Messaging loader contract', () => {
	registerVendorContractCleanup();
	beforeEach(() => {
		vi.stubGlobal('localStorage', jsdom.window.localStorage);
		vi.stubGlobal('sessionStorage', jsdom.window.sessionStorage);
	});
	afterEach(() => {
		delete window.zE;
		delete window.zEmbed;
		vi.unstubAllGlobals();
	});

	it('creates no globals or loader until functionality is allowed', () => {
		const onAppend = vi.fn();
		installHeadProbe(onAppend);
		const cookies = document.cookie;
		const local = { ...window.localStorage };
		const session = { ...window.sessionStorage };
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');
		const scripts = [zendeskWidget({ key: 'widget-key' })];
		loadScripts(scripts, deniedConsents);
		updateScripts(scripts, { ...deniedConsents, measurement: true });
		expect(onAppend).not.toHaveBeenCalled();
		expect(document.cookie).toBe(cookies);
		expect({ ...window.localStorage }).toEqual(local);
		expect({ ...window.sessionStorage }).toEqual(session);
		expect(fetchSpy).not.toHaveBeenCalled();
		expect(xhrSpy).not.toHaveBeenCalled();
		expect(window.zE).toBeUndefined();
		expect(window.zEmbed).toBeUndefined();

		updateScripts(scripts, functionalityConsents);
		expect(onAppend).toHaveBeenCalledOnce();
		expect(getLoader().src).toBe(
			'https://static.zdassets.com/ekr/snippet.js?key=widget-key'
		);
	});

	it.each([
		{ consents: functionalityConsents, range: 'functional' },
		{ consents: allWidgetConsents, range: 'all' },
	])(
		'queues $range storage before the loader executes',
		({ consents, range }) => {
			let queueAtAppend: unknown[][] | undefined;
			let referenceAtAppend: HTMLScriptElement | undefined;
			installHeadProbe((loader) => {
				queueAtAppend = window.zE?._?.map(toArgs);
				expect(window.zE?._?.every(isArgumentsPayload)).toBe(true);
				referenceAtAppend = window.zE?.s;
				loader.dispatchEvent(new Event('load'));
			});
			loadScripts([zendeskWidget({ key: 'widget-key' })], consents);
			expect(queueAtAppend).toEqual([['messenger:set', 'cookies', range]]);
			expect(referenceAtAppend).toBe(getLoader());
			expect(getLoader().id).toMatch(/^c15t-/u);
		}
	);

	it('updates analytics without reinserting the SDK', () => {
		const scripts = [zendeskWidget({ key: 'widget-key' })];
		loadScripts(scripts, allWidgetConsents);
		const loader = getLoader();
		const api = vi.fn();
		window.zE = api;
		loader.dispatchEvent(new Event('load'));

		updateScripts(scripts, functionalityConsents);
		updateScripts(scripts, allWidgetConsents);
		expect(getLoader()).toBe(loader);
		expect(api.mock.calls).toEqual([
			['messenger:set', 'cookies', 'functional'],
			['messenger:set', 'cookies', 'all'],
		]);
	});

	it('queues none for an in-flight revocation and restores the range on re-grant', () => {
		const scripts = [zendeskWidget({ key: 'widget-key' })];
		loadScripts(scripts, functionalityConsents);
		const revoked = getLoader();
		updateScripts(scripts, deniedConsents);
		expect(revoked.isConnected).toBe(false);
		expect(window.zE?._?.map(toArgs)).toEqual([
			['messenger:set', 'cookies', 'functional'],
			['messenger:set', 'cookies', 'none'],
		]);
		revoked.dispatchEvent(new Event('load'));
		expect(window.zE?._).toHaveLength(2);

		updateScripts(scripts, functionalityConsents);
		expect(getLoader()).not.toBe(revoked);
		expect(window.zE?.s).toBe(getLoader());
		expect(window.zE?._?.map(toArgs).at(-1)).toEqual([
			'messenger:set',
			'cookies',
			'functional',
		]);
	});

	it('deduplicates repeated grants and sends none when the loaded vendor is denied', async () => {
		const kernel = createConsentKernel();
		const loader = createScriptLoader({
			kernel,
			scripts: [zendeskWidget({ key: 'widget-key' })],
		});
		try {
			await kernel.commands.save(functionalityConsents, {
				vendors: { zendesk: false },
			});
			expect(document.head.querySelector('script')).toBeNull();
			expect(window.zE).toBeUndefined();
			await kernel.commands.save({}, { vendors: { zendesk: true } });
			const element = getLoader();
			element.dispatchEvent(new Event('load'));
			await kernel.commands.save(functionalityConsents);
			expect(getLoader()).toBe(element);
			expect(document.head.querySelectorAll('script')).toHaveLength(1);
			await kernel.commands.save({}, { vendors: { zendesk: false } });
			expect(element.isConnected).toBe(false);
			expect(window.zE?._?.map(toArgs).at(-1)).toEqual([
				'messenger:set',
				'cookies',
				'none',
			]);
		} finally {
			loader.dispose();
			kernel.dispose();
		}
	});

	it('uses the configured category as the actual core loader gate', () => {
		const scripts = [
			zendeskWidget({ category: 'experience', key: 'widget-key' }),
		];
		loadScripts(scripts, functionalityConsents);
		expect(document.head.querySelector('script')).toBeNull();
		expect(window.zE).toBeUndefined();
		updateScripts(scripts, { ...deniedConsents, experience: true });
		expect(getLoader()).toBeDefined();
		expect(window.zE?._?.map(toArgs)[0]).toEqual([
			'messenger:set',
			'cookies',
			'functional',
		]);
	});
});
