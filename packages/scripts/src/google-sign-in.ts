import type { Script } from 'c15t';
import { resolveManifest } from './resolve';
import { type VendorManifest, vendorManifestContract } from './types';

export interface GoogleCredentialResponse {
	credential: string;
	select_by:
		| 'auto'
		| 'user'
		| 'user_1tap'
		| 'user_2tap'
		| 'btn'
		| 'btn_confirm'
		| 'btn_add_session'
		| 'btn_confirm_add_session';
	clientId?: string;
}

export interface GoogleSignInIdConfiguration {
	client_id: string;
	auto_select?: boolean;
	login_uri?: string;
	cancel_on_tap_outside?: boolean;
	prompt_parent_id?: string;
	nonce?: string;
	context?: 'signin' | 'signup' | 'use';
	state_cookie_domain?: string;
	ux_mode?: 'popup' | 'redirect';
	allowed_parent_origin?: string | string[];
	itp_support?: boolean;
	login_hint?: string;
	hd?: string;
	use_fedcm_for_prompt?: boolean;
}

declare global {
	interface Window {
		google?: {
			accounts?: {
				id?: {
					initialize: (config: GoogleSignInIdConfiguration) => void;
					prompt: () => void;
					renderButton: (
						parent: HTMLElement,
						options: Record<string, unknown>
					) => void;
					disableAutoSelect: () => void;
					cancel: () => void;
				};
			};
		};
	}
}

/**
 * Google Sign-In vendor manifest.
 *
 * The c15t manifest engine can express the external loader, but not the nested
 * `google.accounts.id.*` callback API. Applications should initialize GIS after
 * the script loads.
 */
export const googleSignInManifest = {
	...vendorManifestContract,
	vendor: 'google-sign-in',
	category: 'functionality',
	install: [
		{
			type: 'loadScript',
			src: '{{scriptSrc}}',
			async: true,
			defer: true,
		},
	],
} as const satisfies VendorManifest;

export interface GoogleSignInOptions {
	/** Full Google Identity Services loader URL override. */
	scriptSrc?: string;
}

/**
 * Creates a Google Sign-In script.
 *
 * This helper intentionally keeps the API surface minimal. Runtime-only
 * callbacks such as One Tap handlers must be attached in application code.
 *
 * @param options - Optional configuration for the Google Sign-In script
 * @returns The Google Sign-In script configuration
 */
export function googleSignIn(options: GoogleSignInOptions = {}): Script {
	let resolvedScriptSrc = options.scriptSrc;

	if (!resolvedScriptSrc) {
		resolvedScriptSrc = 'https://accounts.google.com/gsi/client';
	}

	const resolved = resolveManifest(googleSignInManifest, {
		scriptSrc: resolvedScriptSrc,
	});

	return resolved;
}
