/**
 * @vitest-environment jsdom
 */

import type { Script } from '@c15t/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	createCallbackInfo,
	deniedConsentState,
	expectSkippedScript,
} from '../../__tests__/helpers';
import { gorgiasChat } from './gorgias';
import type { GorgiasChatOptions } from './gorgias';

const grantedConsents = { ...deniedConsentState, functionality: true };

describe('gorgiasChat', () => {
	const scripts: Script[] = [];
	const create = (options: GorgiasChatOptions): Script => {
		const script = gorgiasChat(options);
		scripts.push(script);
		return script;
	};
	const mount = (script: Script): HTMLScriptElement => {
		const element = document.createElement('script');
		script.onBeforeLoad?.(
			createCallbackInfo({
				consents: grantedConsents,
				element,
				hasConsent: true,
				id: script.id,
			})
		);
		document.body.appendChild(element);
		return element;
	};

	afterEach(() => {
		vi.unstubAllGlobals();
		for (const script of scripts.splice(0)) {
			script.onDispose?.(createCallbackInfo({ id: script.id }));
		}
		delete window.GorgiasChat;
		document.body.innerHTML = '';
		vi.restoreAllMocks();
	});

	it('declares the consent gate, vendor and official v3 installation', () => {
		const script = create({ appKey: '  public-app-key  ' });
		expect(script).toMatchObject({
			async: true,
			category: 'functionality',
			id: 'gorgias',
			src: 'https://config.gorgias.chat/bundle-loader/public-app-key',
			target: 'body',
			vendor: 'gorgias',
			vendorDetails: {
				legalName: 'Gorgias Inc.',
				name: 'Gorgias Chat',
				privacyPolicyUrl: 'https://www.gorgias.com/legal/privacy',
			},
		});
		expect(script.alwaysLoad).toBeUndefined();
		expect(script.attributes).toBeUndefined();
		expect(script.persistAfterConsentRevoked).toBeUndefined();
		expect(script.serverStart).toBeUndefined();
		expect(window.GorgiasChat).toBeUndefined();
	});

	it('supports the documented legacy application ID installation', () => {
		const script = create({ appKey: '36444', version: 2 });
		expect(script.src).toBe(
			'https://config.gorgias.chat/gorgias-chat-bundle-loader.js?applicationId=36444'
		);
		expect(script.attributes).toBeUndefined();
	});

	it.each([2, 3] as const)(
		'encodes the v%s key as one URL value',
		(version) => {
			const script = create({ appKey: 'key/with?query&value', version });
			expect(script.src).toContain('key%2Fwith%3Fquery%26value');
		}
	);

	it.each(['', '   ', undefined, null, {}])(
		'logs and skips invalid app key %s',
		(appKey) => {
			expectSkippedScript(
				() => create({ appKey: appKey as string }),
				{ category: 'functionality', id: 'gorgias' },
				'gorgiasChat: missing or invalid appKey'
			);
		}
	);

	it('waits for the real loader proxy contract before reading API methods', async () => {
		let resolveInit: (() => void) | undefined;
		const promise = new Promise<void>((resolve) => {
			resolveInit = resolve;
		});
		const api = { disableSegment: vi.fn(), init: vi.fn(() => promise) };
		let initialized = false;
		window.GorgiasChat = new Proxy(api, {
			get(target, key) {
				if (!initialized && key !== 'init') {
					throw new Error('Gorgias API read before initialization');
				}
				if (key === 'init') {
					return target.init;
				}
				if (key === 'disableSegment') {
					return target.disableSegment;
				}
				return undefined;
			},
		});
		const script = create({ appKey: 'key' });
		const element = mount(script);
		expect(() =>
			script.onLoad?.(
				createCallbackInfo({
					consents: grantedConsents,
					element,
					hasConsent: true,
					id: script.id,
				})
			)
		).not.toThrow();
		expect(api.disableSegment).not.toHaveBeenCalled();
		initialized = true;
		resolveInit?.();
		await promise;
		expect(api.disableSegment).toHaveBeenCalledOnce();
	});

	it('ignores readiness events before consent and after disposal', () => {
		const api = {
			disableSegment: vi.fn(),
			init: vi.fn(() => Promise.resolve()),
		};
		window.GorgiasChat = api;
		const script = create({ appKey: 'key' });
		window.dispatchEvent(new Event('gorgias-widget-loaded'));
		expect(api.disableSegment).not.toHaveBeenCalled();
		mount(script);
		script.onDispose?.(createCallbackInfo({ id: script.id }));
		window.dispatchEvent(new Event('gorgias-widget-loaded'));
		expect(api.init).not.toHaveBeenCalled();
		expect(api.disableSegment).not.toHaveBeenCalled();
	});

	it('reports an initialization rejection while consent still allows loading', async () => {
		const error = new Error('initialization failed');
		const report = vi.spyOn(console, 'error').mockImplementation(() => {});
		window.GorgiasChat = {
			disableSegment: vi.fn(),
			init: vi.fn(() => Promise.reject(error)),
		};
		const script = create({ appKey: 'key' });
		const element = mount(script);
		script.onLoad?.(
			createCallbackInfo({
				consents: grantedConsents,
				element,
				hasConsent: true,
				id: script.id,
			})
		);
		await Promise.resolve();
		expect(report).toHaveBeenCalledExactlyOnceWith(
			'gorgiasChat: chat initialization failed.',
			error
		);
	});

	it('can create the integration during SSR', () => {
		vi.stubGlobal('window', undefined);
		expect(() => create({ appKey: 'key' })).not.toThrow();
	});
});
