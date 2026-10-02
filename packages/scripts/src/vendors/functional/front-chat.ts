import type { Script } from 'c15t';
import { resolveManifest } from '../../resolve';
import { type VendorManifest, vendorManifestContract } from '../../types';
import { resolveScriptUrl, trimToUndefined } from '../_shared/script-url';

declare global {
	interface Window {
		FrontChat?: (command: string, options?: Record<string, unknown>) => unknown;
	}
}

const FRONT_CHAT_SCRIPT_SRC =
	'https://chat-assets.frontapp.com/v1/chat.bundle.js';

/** Front Chat loader and consent-gated widget initialisation. */
export const frontChatManifest = {
	...vendorManifestContract,
	vendor: 'front-chat',
	category: 'functionality',
	install: [
		{
			type: 'loadScript',
			src: '{{scriptSrc}}',
			async: true,
		},
	],
	onLoadGranted: [
		{
			type: 'callGlobal',
			global: 'FrontChat',
			args: ['init', '{{initOptions}}'],
		},
	],
} as const satisfies VendorManifest;

export interface FrontChatOptions {
	/** Public chat ID from the Front channel's installation snippet. */
	chatId: string;
	/** Show Front's default launcher. @default true */
	useDefaultLauncher?: boolean;
	/** Custom or proxied Front Chat bundle URL. */
	scriptSrc?: string;
	/** CSP nonce forwarded to the loader and Front's generated scripts. */
	nonce?: string;
}

/**
 * Creates a Front Chat script gated on functionality consent.
 *
 * Keep c15t's default reload-on-revocation behaviour enabled to stop an
 * already-running widget. Removing its loader cannot unload the SDK.
 *
 * @param options - Front channel and launcher configuration.
 * @returns The Front Chat script configuration.
 * @throws {Error} When chatId is missing or empty. Copy the public ID from
 * the Front channel's installation snippet.
 * @example
 * frontChat({ chatId: 'YOUR_FRONT_CHAT_ID' });
 * @see https://help.front.com/en/articles/2049
 */
export function frontChat(options: FrontChatOptions): Script {
	const chatId =
		typeof options?.chatId === 'string' ? options.chatId.trim() : '';
	if (!chatId) {
		throw new Error('frontChat: chatId must be a non-empty string.');
	}

	const scriptSrc = resolveScriptUrl(
		trimToUndefined(options.scriptSrc),
		FRONT_CHAT_SCRIPT_SRC
	);
	const nonce = trimToUndefined(options.nonce);
	const initOptions = {
		chatId,
		useDefaultLauncher: options.useDefaultLauncher ?? true,
		...(nonce ? { nonce } : {}),
	};
	const script = resolveManifest(frontChatManifest, {
		scriptSrc,
		initOptions,
	});

	return {
		...script,
		target: 'body',
		nonce,
		onLoad(info) {
			// Consent is captured when core inserts the loader. Its element can
			// be removed while downloading; ignore that detached load event.
			if (!info.hasConsent || !info.element?.isConnected) {
				return;
			}

			// Core can also supply the nonce from provider configuration. Front
			// needs the same nonce in init for its dynamically generated scripts.
			const loadedNonce = info.element.nonce;
			const resolved = loadedNonce
				? resolveManifest(frontChatManifest, {
						scriptSrc,
						initOptions: { ...initOptions, nonce: loadedNonce },
					})
				: script;
			resolved.onLoad?.(info);
		},
	};
}

/**
 * Requests widget removal and session cleanup through Front's SDK.
 *
 * Optionally call before c15t's revocation reload. Front does not provide a
 * completion promise, so this does not guarantee cleanup before navigation.
 * Safe to call during SSR or before the SDK loads.
 *
 * @returns Nothing.
 * @example
 * shutdownFrontChat();
 * @see https://dev.frontapp.com/docs/chat-sdk-reference
 */
export function shutdownFrontChat(): void {
	if (typeof window !== 'undefined' && typeof window.FrontChat === 'function') {
		window.FrontChat('shutdown', { clearSession: true });
	}
}
