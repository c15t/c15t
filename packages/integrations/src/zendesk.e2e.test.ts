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

	it.each([false, true])(
		'keeps different widget keys on separate loader resources, loaded=%s',
		async (loaded) => {
			const firstKernel = createConsentKernel();
			const secondKernel = createConsentKernel();
			await firstKernel.commands.save(functionalityConsents);
			await secondKernel.commands.save(functionalityConsents);
			const first = createScriptLoader({
				kernel: firstKernel,
				scripts: [zendeskWidget({ key: 'first-widget' })],
			});
			const firstElement = getLoader();
			if (loaded) {
				firstElement.dispatchEvent(new Event('load'));
			}
			const second = createScriptLoader({
				kernel: secondKernel,
				scripts: [zendeskWidget({ key: 'second-widget' })],
			});
			try {
				const elements = [...document.head.querySelectorAll('script')];
				expect(elements.map((element) => element.src)).toEqual([
					'https://static.zdassets.com/ekr/snippet.js?key=first-widget',
					'https://static.zdassets.com/ekr/snippet.js?key=second-widget',
				]);
				expect(elements[1]?.id).not.toBe(firstElement.id);
				second.dispose();
				expect(firstElement.isConnected).toBe(true);
				expect(elements[1]?.isConnected).toBe(false);
			} finally {
				first.dispose();
				second.dispose();
				firstKernel.dispose();
				secondKernel.dispose();
			}
		}
	);

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

	it.each(['remove', 'dispose'] as const)(
		'does not send none on granted %s and resumes updates on remount',
		async (cleanup) => {
			const kernel = createConsentKernel();
			await kernel.commands.save(functionalityConsents);
			const script = zendeskWidget({ key: 'widget-key' });
			const loader = createScriptLoader({
				kernel,
				scripts: [script],
			});
			try {
				const element = getLoader();
				element.dispatchEvent(new Event('load'));
				const api = vi.fn();
				window.zE = api;
				if (cleanup === 'remove') {
					loader.updateScripts([]);
				} else {
					loader.dispose();
				}
				expect(element.isConnected).toBe(false);
				expect(api).not.toHaveBeenCalledWith(
					'messenger:set',
					'cookies',
					'none'
				);
				expect(window.zE).toBe(api);
				const callsAfterCleanup = api.mock.calls.length;
				await kernel.commands.save(deniedConsents);
				expect(api).toHaveBeenCalledTimes(callsAfterCleanup);
				await kernel.commands.save(functionalityConsents);
				const remounted = createScriptLoader({ kernel, scripts: [script] });
				try {
					expect(getLoader()).not.toBe(element);
					expect(window.zE?.s).toBe(getLoader());
					expect(api).toHaveBeenLastCalledWith(
						'messenger:set',
						'cookies',
						'functional'
					);
				} finally {
					remounted.dispose();
				}
			} finally {
				loader.dispose();
				kernel.dispose();
			}
		}
	);

	it.each([false, true])(
		'keeps an equivalent helper active across updates and regrant, loaded=%s',
		(loaded) => {
			loadScripts(
				[zendeskWidget({ key: 'widget-key' })],
				functionalityConsents
			);
			const element = getLoader();
			if (loaded) {
				element.dispatchEvent(new Event('load'));
			}
			const api = vi.fn();
			window.zE = api;
			const replacement = [zendeskWidget({ key: ' widget-key ' })];
			updateScripts(replacement, allWidgetConsents);
			expect(getLoader()).toBe(element);
			expect(api).toHaveBeenLastCalledWith('messenger:set', 'cookies', 'all');
			expect(api).not.toHaveBeenCalledWith('messenger:set', 'cookies', 'none');

			updateScripts(replacement, deniedConsents);
			expect(element.isConnected).toBe(false);
			expect(api).toHaveBeenLastCalledWith('messenger:set', 'cookies', 'none');
			updateScripts(replacement, functionalityConsents);
			expect(getLoader()).not.toBe(element);
			expect(window.zE).toBe(api);
			expect(window.zE?.s).toBe(getLoader());
			expect(api).toHaveBeenLastCalledWith(
				'messenger:set',
				'cookies',
				'functional'
			);
		}
	);

	it.each([
		['remove', false],
		['remove', true],
		['dispose', false],
		['dispose', true],
		['revoke', false],
		['revoke', true],
	] as const)(
		'keeps a shared granted owner active on %s, reverse owners=%s',
		async (cleanup, reverse) => {
			const firstKernel = createConsentKernel();
			const secondKernel = createConsentKernel();
			await firstKernel.commands.save(functionalityConsents);
			await secondKernel.commands.save(functionalityConsents);
			const first = createScriptLoader({
				kernel: firstKernel,
				scripts: [zendeskWidget({ key: 'widget-key' })],
			});
			const element = getLoader();
			element.dispatchEvent(new Event('load'));
			const second = createScriptLoader({
				kernel: secondKernel,
				scripts: [zendeskWidget({ key: 'widget-key' })],
			});
			const removed = reverse ? second : first;
			const removedKernel = reverse ? secondKernel : firstKernel;
			const survivingKernel = reverse ? firstKernel : secondKernel;
			try {
				const api = vi.fn();
				window.zE = api;
				if (cleanup === 'remove') {
					removed.updateScripts([]);
				} else if (cleanup === 'dispose') {
					removed.dispose();
				} else {
					await removedKernel.commands.save(deniedConsents);
				}
				expect(getLoader()).toBe(element);
				expect(api).not.toHaveBeenCalledWith(
					'messenger:set',
					'cookies',
					'none'
				);
				await survivingKernel.commands.save(allWidgetConsents);
				expect(api).toHaveBeenLastCalledWith('messenger:set', 'cookies', 'all');
				await survivingKernel.commands.save(deniedConsents);
				expect(element.isConnected).toBe(false);
				expect(api).toHaveBeenLastCalledWith(
					'messenger:set',
					'cookies',
					'none'
				);
				await survivingKernel.commands.save(functionalityConsents);
				expect(getLoader()).not.toBe(element);
				expect(window.zE?.s).toBe(getLoader());
				expect(window.zE).toBe(api);
				expect(api).toHaveBeenLastCalledWith(
					'messenger:set',
					'cookies',
					'functional'
				);
			} finally {
				first.dispose();
				second.dispose();
				firstKernel.dispose();
				secondKernel.dispose();
			}
		}
	);
});
