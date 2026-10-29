/**
 * @vitest-environment jsdom
 */

import { createConsentKernel } from '@c15t/core';
import { createScriptLoader } from '@c15t/core/modules/script-loader';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	clearAllScripts,
	deniedConsents,
	loadScripts,
	registerVendorContractCleanup,
	updateScripts,
} from './e2e-test-utils';
import { gorgiasChat } from './vendors/functional/gorgias';

interface GorgiasWindow extends Window {
	gorgiasChat?: { init: () => Promise<unknown> };
	gorgiasChatPendingEvents?: { type: string }[];
}

const gorgiasWindow = window as GorgiasWindow;
const grantedConsents = { ...deniedConsents, functionality: true };

const getLoader = function getLoader(): HTMLScriptElement {
	const element = document.body.querySelector('script');
	if (!element) {
		throw new Error('Expected the Gorgias loader.');
	}
	return element;
};

// These are synthetic SDK responses through the production core loader.
// They test our lifecycle, not Gorgias's live runtime or network behavior.
describe('Gorgias Chat loader contract', () => {
	registerVendorContractCleanup();
	beforeEach(() => {
		// Node's storage globals can shadow jsdom's browser storage.
		vi.stubGlobal('localStorage', jsdom.window.localStorage);
		vi.stubGlobal('sessionStorage', jsdom.window.sessionStorage);
	});
	afterEach(() => {
		delete window.GorgiasChat;
		delete gorgiasWindow.gorgiasChat;
		delete gorgiasWindow.gorgiasChatPendingEvents;
		window.localStorage.removeItem('gorgias-review-test-unrelated');
		window.sessionStorage.removeItem('gorgias-review-test-unrelated');
		document.cookie = 'gorgias_review_test_unrelated=; Max-Age=0; Path=/';
		vi.unstubAllGlobals();
	});

	it('creates no vendor global, loader or storage before the mapped grant', () => {
		const cookies = document.cookie;
		const local = { ...window.localStorage };
		const session = { ...window.sessionStorage };
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');
		const scripts = [gorgiasChat({ appKey: 'key' })];
		loadScripts(scripts, deniedConsents);
		expect(document.body.querySelector('script')).toBeNull();
		expect(window.GorgiasChat).toBeUndefined();
		expect(gorgiasWindow.gorgiasChat).toBeUndefined();
		expect(gorgiasWindow.gorgiasChatPendingEvents).toBeUndefined();
		expect(document.cookie).toBe(cookies);
		expect({ ...window.localStorage }).toEqual(local);
		expect({ ...window.sessionStorage }).toEqual(session);
		expect(fetchSpy).not.toHaveBeenCalled();
		expect(xhrSpy).not.toHaveBeenCalled();

		updateScripts(scripts, grantedConsents);
		const element = getLoader();
		expect(element.id).toMatch(/^c15t-/u);
		expect(element.src).toBe('https://config.gorgias.chat/bundle-loader/key');
		expect(window.GorgiasChat).toBeUndefined();
	});

	it.each(['experience', 'marketing', 'measurement'] as const)(
		'does not load for unrelated %s consent',
		(category) => {
			const scripts = [gorgiasChat({ appKey: 'key' })];
			loadScripts(scripts, { ...deniedConsents, [category]: true });
			expect(document.querySelector('script')).toBeNull();
			expect(window.GorgiasChat).toBeUndefined();
			expect(gorgiasWindow.gorgiasChat).toBeUndefined();
			expect(gorgiasWindow.gorgiasChatPendingEvents).toBeUndefined();
		}
	);

	it.each([2, 3] as const)(
		'preserves core identity, encoded v%s URLs and one loader across repeated grants',
		async (version) => {
			const script = gorgiasChat({
				appKey: '  key/with?query&value  ',
				version,
			});
			const scripts = [script, script];
			loadScripts(scripts, grantedConsents);
			const element = getLoader();
			expect(element.id).toMatch(/^c15t-/u);
			expect(document.getElementById(element.id)).toBe(element);
			expect(element.src).toBe(
				version === 2
					? 'https://config.gorgias.chat/gorgias-chat-bundle-loader.js?applicationId=key%2Fwith%3Fquery%26value'
					: 'https://config.gorgias.chat/bundle-loader/key%2Fwith%3Fquery%26value'
			);
			const api = {
				disableSegment: vi.fn(),
				init: vi.fn(() => Promise.resolve()),
			};
			window.GorgiasChat = api;
			element.dispatchEvent(new Event('load'));
			element.dispatchEvent(new Event('load'));
			updateScripts(scripts, grantedConsents);
			await Promise.resolve();
			updateScripts(scripts, grantedConsents);
			expect(api.init).toHaveBeenCalledOnce();
			expect(api.disableSegment).toHaveBeenCalledOnce();
			expect(document.body.querySelectorAll('script')).toHaveLength(1);
			expect(getLoader()).toBe(element);
			expect(window.GorgiasChat).toBe(api);
		}
	);

	it('uses the widget-loaded event when the bundle initializes before load', () => {
		loadScripts([gorgiasChat({ appKey: 'key' })], grantedConsents);
		const api = {
			disableSegment: vi.fn(),
			init: vi.fn(() => Promise.resolve()),
		};
		window.GorgiasChat = api;
		window.dispatchEvent(new Event('gorgias-widget-loaded'));
		getLoader().dispatchEvent(new Event('load'));
		window.dispatchEvent(new Event('gorgias-widget-loaded'));
		expect(api.disableSegment).toHaveBeenCalledOnce();
		expect(api.init).not.toHaveBeenCalled();
	});

	it('waits for init and reads the latest measurement choice at completion', async () => {
		let resolveInit: (() => void) | undefined;
		const promise = new Promise<void>((resolve) => {
			resolveInit = resolve;
		});
		const api = { disableSegment: vi.fn(), init: vi.fn(() => promise) };
		const scripts = [gorgiasChat({ appKey: 'key' })];
		loadScripts(scripts, { ...grantedConsents, measurement: true });
		window.GorgiasChat = api;
		getLoader().dispatchEvent(new Event('load'));
		updateScripts(scripts, grantedConsents);
		expect(api.init).toHaveBeenCalledOnce();
		expect(api.disableSegment).not.toHaveBeenCalled();
		resolveInit?.();
		await promise;
		expect(api.disableSegment).toHaveBeenCalledOnce();
	});

	it('disables Segment on measurement revocation without inventing a re-enable API', () => {
		const scripts = [gorgiasChat({ appKey: 'key' })];
		loadScripts(scripts, { ...grantedConsents, measurement: true });
		const disableSegment = vi.fn();
		window.GorgiasChat = {
			disableSegment,
			init: vi.fn(() => Promise.resolve()),
		};
		window.dispatchEvent(new Event('gorgias-widget-loaded'));
		expect(disableSegment).not.toHaveBeenCalled();
		updateScripts(scripts, grantedConsents);
		expect(disableSegment).toHaveBeenCalledOnce();
		updateScripts(scripts, { ...grantedConsents, measurement: true });
		expect(disableSegment).toHaveBeenCalledOnce();
		expect(document.body.querySelectorAll('script')).toHaveLength(1);
	});

	it('invalidates a pending init when functionality is revoked', async () => {
		let resolveInit: (() => void) | undefined;
		const promise = new Promise<void>((resolve) => {
			resolveInit = resolve;
		});
		const api = { disableSegment: vi.fn(), init: vi.fn(() => promise) };
		const scripts = [gorgiasChat({ appKey: 'key' })];
		loadScripts(scripts, grantedConsents);
		window.GorgiasChat = api;
		const element = getLoader();
		element.dispatchEvent(new Event('load'));
		expect(api.init).toHaveBeenCalledOnce();
		updateScripts(scripts, deniedConsents);
		expect(element.isConnected).toBe(false);
		resolveInit?.();
		await promise;
		window.dispatchEvent(new Event('gorgias-widget-loaded'));
		expect(api.init).toHaveBeenCalledOnce();
		expect(api.disableSegment).not.toHaveBeenCalled();
	});

	it('ignores a detached load and handles a subsequent grant', () => {
		const scripts = [gorgiasChat({ appKey: 'key' })];
		loadScripts(scripts, grantedConsents);
		const previous = getLoader();
		updateScripts(scripts, deniedConsents);
		const api = {
			disableSegment: vi.fn(),
			init: vi.fn(() => Promise.resolve()),
		};
		window.GorgiasChat = api;
		previous.dispatchEvent(new Event('load'));
		window.dispatchEvent(new Event('gorgias-widget-loaded'));
		expect(api.init).not.toHaveBeenCalled();
		expect(api.disableSegment).not.toHaveBeenCalled();

		updateScripts(scripts, grantedConsents);
		const current = getLoader();
		expect(current).not.toBe(previous);
		window.dispatchEvent(new Event('gorgias-widget-loaded'));
		expect(api.disableSegment).toHaveBeenCalledOnce();
	});

	it('does not let an old init promise complete a later grant', async () => {
		let resolvePrevious: (() => void) | undefined;
		const previousPromise = new Promise<void>((resolve) => {
			resolvePrevious = resolve;
		});
		const previousApi = {
			disableSegment: vi.fn(),
			init: vi.fn(() => previousPromise),
		};
		const scripts = [gorgiasChat({ appKey: 'key' })];
		loadScripts(scripts, grantedConsents);
		window.GorgiasChat = previousApi;
		const previous = getLoader();
		previous.dispatchEvent(new Event('load'));
		updateScripts(scripts, deniedConsents);
		updateScripts(scripts, grantedConsents);

		let resolveCurrent: (() => void) | undefined;
		const currentPromise = new Promise<void>((resolve) => {
			resolveCurrent = resolve;
		});
		const currentApi = {
			disableSegment: vi.fn(),
			init: vi.fn(() => currentPromise),
		};
		window.GorgiasChat = currentApi;
		getLoader().dispatchEvent(new Event('load'));
		expect(previousApi.init).toHaveBeenCalledOnce();
		expect(currentApi.init).toHaveBeenCalledOnce();
		resolvePrevious?.();
		await previousPromise;
		expect(previousApi.disableSegment).not.toHaveBeenCalled();
		expect(currentApi.disableSegment).not.toHaveBeenCalled();
		resolveCurrent?.();
		await currentPromise;
		expect(currentApi.disableSegment).toHaveBeenCalledOnce();
		expect(window.GorgiasChat).toBe(currentApi);
		expect(getLoader()).not.toBe(previous);
	});

	it('uses the mapped category for both grant and revoke', () => {
		const scripts = [
			{ ...gorgiasChat({ appKey: 'key' }), category: 'marketing' as const },
		];
		loadScripts(scripts, grantedConsents);
		expect(document.body.querySelector('script')).toBeNull();
		updateScripts(scripts, { ...deniedConsents, marketing: true });
		const api = {
			disableSegment: vi.fn(),
			init: vi.fn(() => Promise.resolve()),
		};
		window.GorgiasChat = api;
		window.dispatchEvent(new Event('gorgias-widget-loaded'));
		expect(api.disableSegment).toHaveBeenCalledOnce();
		updateScripts(scripts, grantedConsents);
		expect(document.body.querySelector('script')).toBeNull();
	});

	it('disables active Segment on functionality revocation despite measurement consent', () => {
		const scripts = [gorgiasChat({ appKey: 'key' })];
		loadScripts(scripts, { ...grantedConsents, measurement: true });
		const api = {
			disableSegment: vi.fn(),
			init: vi.fn(() => Promise.resolve()),
		};
		window.GorgiasChat = api;
		window.dispatchEvent(new Event('gorgias-widget-loaded'));
		updateScripts(scripts, { ...deniedConsents, measurement: true });
		expect(api.disableSegment).toHaveBeenCalledOnce();
		expect(document.body.querySelector('script')).toBeNull();
	});

	it('honors vendor denial while the functionality category remains allowed', async () => {
		const kernel = createConsentKernel();
		const loader = createScriptLoader({
			kernel,
			scripts: [gorgiasChat({ appKey: 'key' })],
		});
		try {
			await kernel.commands.save(
				{ ...grantedConsents, measurement: true },
				{
					vendors: { gorgias: false },
				}
			);
			expect(document.body.querySelector('script')).toBeNull();
			await kernel.commands.save({}, { vendors: { gorgias: true } });
			const element = getLoader();
			const api = {
				disableSegment: vi.fn(),
				init: vi.fn(() => Promise.resolve()),
			};
			window.GorgiasChat = api;
			window.dispatchEvent(new Event('gorgias-widget-loaded'));
			expect(api.disableSegment).not.toHaveBeenCalled();
			await kernel.commands.save({}, { vendors: { gorgias: false } });
			expect(kernel.getSnapshot().effectivePermissions.functionality).toBe(
				true
			);
			expect(element.isConnected).toBe(false);
			expect(api.disableSegment).toHaveBeenCalledOnce();
			element.dispatchEvent(new Event('load'));
			window.dispatchEvent(new Event('gorgias-widget-loaded'));
			expect(api.init).not.toHaveBeenCalled();
			expect(api.disableSegment).toHaveBeenCalledOnce();
		} finally {
			loader.dispose();
			kernel.dispose();
		}
	});

	it('invalidates pending readiness when the core loader is disposed', async () => {
		let resolveInit: (() => void) | undefined;
		const promise = new Promise<void>((resolve) => {
			resolveInit = resolve;
		});
		const api = { disableSegment: vi.fn(), init: vi.fn(() => promise) };
		loadScripts([gorgiasChat({ appKey: 'key' })], grantedConsents);
		window.GorgiasChat = api;
		getLoader().dispatchEvent(new Event('load'));
		clearAllScripts();
		resolveInit?.();
		await promise;
		window.dispatchEvent(new Event('gorgias-widget-loaded'));
		expect(api.disableSegment).not.toHaveBeenCalled();
	});

	it('cancels pending readiness on loader failure without clearing vendor or unrelated state', async () => {
		let resolveInit: (() => void) | undefined;
		const promise = new Promise<void>((resolve) => {
			resolveInit = resolve;
		});
		const scripts = [gorgiasChat({ appKey: 'key' })];
		loadScripts(scripts, grantedConsents);
		const api = { disableSegment: vi.fn(), init: vi.fn(() => promise) };
		const legacyApi = { init: api.init };
		const queue = [{ type: 'vendor-owned-event' }];
		window.GorgiasChat = api;
		gorgiasWindow.gorgiasChat = legacyApi;
		gorgiasWindow.gorgiasChatPendingEvents = queue;
		window.localStorage.setItem('gorgias-review-test-unrelated', 'preserve');
		window.sessionStorage.setItem('gorgias-review-test-unrelated', 'preserve');
		document.cookie = 'gorgias_review_test_unrelated=preserve; Path=/';
		const cookies = document.cookie;
		const local = { ...window.localStorage };
		const session = { ...window.sessionStorage };
		updateScripts(scripts, grantedConsents);
		expect(api.init).toHaveBeenCalledOnce();
		getLoader().dispatchEvent(new Event('error'));
		resolveInit?.();
		await promise;
		window.dispatchEvent(new Event('gorgias-widget-loaded'));
		clearAllScripts();
		expect(api.disableSegment).not.toHaveBeenCalled();
		expect(window.GorgiasChat).toBe(api);
		expect(gorgiasWindow.gorgiasChat).toBe(legacyApi);
		expect(gorgiasWindow.gorgiasChatPendingEvents).toBe(queue);
		expect(queue).toEqual([{ type: 'vendor-owned-event' }]);
		expect(document.cookie).toBe(cookies);
		expect({ ...window.localStorage }).toEqual(local);
		expect({ ...window.sessionStorage }).toEqual(session);
	});
});
