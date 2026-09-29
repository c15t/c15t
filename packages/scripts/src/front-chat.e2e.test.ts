/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	deniedConsents,
	loadScripts,
	registerVendorContractCleanup,
	updateScripts,
} from './e2e-test-utils';
import { frontChat } from './vendors/functional/front-chat';

const grantedConsents = { ...deniedConsents, functionality: true };

function getLoader(): HTMLScriptElement {
	const element = document.body.querySelector('script');
	if (!element) {
		throw new Error('Expected a Front Chat loader.');
	}
	return element;
}

describe('Front Chat loader contract', () => {
	registerVendorContractCleanup();
	afterEach(() => {
		delete window.FrontChat;
	});

	it('waits for functionality consent and SDK load, then initialises once', () => {
		const scripts = [frontChat({ chatId: 'channel-id' })];
		window.FrontChat = vi.fn();
		loadScripts(scripts, deniedConsents);
		expect(document.body.querySelector('script')).toBeNull();
		expect(window.FrontChat).not.toHaveBeenCalled();

		updateScripts(scripts, grantedConsents);
		const element = getLoader();
		expect(element.src).toBe(
			'https://chat-assets.frontapp.com/v1/chat.bundle.js'
		);
		expect(window.FrontChat).not.toHaveBeenCalled();
		element.dispatchEvent(new Event('load'));
		updateScripts(scripts, grantedConsents);
		expect(window.FrontChat).toHaveBeenCalledExactlyOnceWith('init', {
			chatId: 'channel-id',
			useDefaultLauncher: true,
		});
	});

	it('ignores a revoked in-flight load and initialises a subsequent permitted load', () => {
		const scripts = [frontChat({ chatId: 'channel-id' })];
		window.FrontChat = vi.fn();
		loadScripts(scripts, grantedConsents);
		const revoked = getLoader();
		updateScripts(scripts, deniedConsents);
		expect(revoked.isConnected).toBe(false);
		revoked.dispatchEvent(new Event('load'));
		expect(window.FrontChat).not.toHaveBeenCalled();

		updateScripts(scripts, grantedConsents);
		const current = getLoader();
		expect(current).not.toBe(revoked);
		current.dispatchEvent(new Event('load'));
		expect(window.FrontChat).toHaveBeenCalledOnce();
	});

	it('propagates the core loader CSP nonce into the Front SDK', () => {
		window.FrontChat = vi.fn();
		loadScripts(
			[frontChat({ chatId: 'channel-id' })],
			grantedConsents,
			{},
			{
				nonce: 'provider-nonce',
			}
		);
		const element = getLoader();
		expect(element.nonce).toBe('provider-nonce');
		element.dispatchEvent(new Event('load'));
		expect(window.FrontChat).toHaveBeenCalledWith('init', {
			chatId: 'channel-id',
			useDefaultLauncher: true,
			nonce: 'provider-nonce',
		});
	});
});
