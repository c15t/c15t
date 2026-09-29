/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	createCallbackInfo,
	expectScriptMatchesIntegration,
} from '../../__tests__/helpers';
import { frontChat, shutdownFrontChat } from './front-chat';

describe('frontChat', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		delete window.FrontChat;
		document.body.innerHTML = '';
	});

	it('matches the functional integration registry', () => {
		expectScriptMatchesIntegration('frontChat', frontChat({ chatId: 'test' }), {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://chat-assets.frontapp.com/v1/chat.bundle.js',
		});
	});

	it.each([
		'',
		'   ',
		undefined,
		null,
		42,
	])('rejects invalid chat ID %s', (chatId) => {
		expect(() => frontChat({ chatId: chatId as string })).toThrow(
			'chatId must be a non-empty string'
		);
	});

	it('normalises the ID and passes launcher configuration after load', () => {
		window.FrontChat = vi.fn();
		const script = frontChat({
			chatId: '  channel-id  ',
			useDefaultLauncher: false,
		});
		const element = document.createElement('script');
		document.body.appendChild(element);
		script.onLoad?.(
			createCallbackInfo({ id: script.id, hasConsent: true, element })
		);
		expect(window.FrontChat).toHaveBeenCalledExactlyOnceWith('init', {
			chatId: 'channel-id',
			useDefaultLauncher: false,
		});
	});

	it('forwards a provider-injected nonce to Front init', () => {
		window.FrontChat = vi.fn();
		const script = frontChat({ chatId: 'channel-id' });
		const element = document.createElement('script');
		element.nonce = 'provider-nonce';
		document.body.appendChild(element);
		script.onLoad?.(
			createCallbackInfo({ id: script.id, hasConsent: true, element })
		);
		expect(window.FrontChat).toHaveBeenCalledExactlyOnceWith('init', {
			chatId: 'channel-id',
			useDefaultLauncher: true,
			nonce: 'provider-nonce',
		});
	});

	it('supports a custom loader and explicit nonce', () => {
		const script = frontChat({
			chatId: 'channel-id',
			scriptSrc: ' https://example.com/front.js ',
			nonce: 'script-nonce',
		});
		expect(script.src).toBe('https://example.com/front.js');
		expect(script.nonce).toBe('script-nonce');
		expect(script.target).toBe('body');
	});

	it('never initialises a denied or detached load', () => {
		window.FrontChat = vi.fn();
		const script = frontChat({ chatId: 'channel-id' });
		const element = document.createElement('script');
		script.onLoad?.(
			createCallbackInfo({ id: script.id, hasConsent: true, element })
		);
		document.body.appendChild(element);
		script.onLoad?.(
			createCallbackInfo({ id: script.id, hasConsent: false, element })
		);
		expect(window.FrontChat).not.toHaveBeenCalled();
	});

	it('requests session clearing when explicitly shut down', () => {
		window.FrontChat = vi.fn();
		shutdownFrontChat();
		expect(window.FrontChat).toHaveBeenCalledExactlyOnceWith('shutdown', {
			clearSession: true,
		});
	});

	it('can be created and shut down without a browser or loaded SDK', () => {
		expect(() => shutdownFrontChat()).not.toThrow();
		vi.stubGlobal('window', undefined);
		expect(() => frontChat({ chatId: 'channel-id' })).not.toThrow();
		expect(() => shutdownFrontChat()).not.toThrow();
	});
});
