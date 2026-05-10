import type { Script } from 'c15t';
import { resolveManifest } from './resolve';
import { type VendorManifest, vendorManifestContract } from './types';

declare global {
	interface Window {
		grecaptcha?: {
			ready?: (callback: () => void) => void;
			execute?: (
				siteKey: string,
				options: { action: string }
			) => Promise<string>;
			enterprise?: {
				ready?: (callback: () => void) => void;
				execute?: (
					siteKey: string,
					options: { action: string }
				) => Promise<string>;
			};
		};
	}
}

/**
 * Google reCAPTCHA vendor manifest.
 *
 * The serializable part of this integration is the loader URL. Runtime helpers
 * such as `grecaptcha.ready()` remain vendor-managed after the script loads.
 */
export const googleRecaptchaManifest = {
	...vendorManifestContract,
	vendor: 'google-recaptcha',
	category: 'necessary',
	install: [
		{
			type: 'loadScript',
			src: '{{scriptSrc}}',
			async: true,
		},
	],
} as const satisfies VendorManifest;

export interface GoogleRecaptchaOptions {
	/**
	 * Your reCAPTCHA site key.
	 */
	siteKey: string;

	/**
	 * Uses the Enterprise loader when enabled.
	 */
	enterprise?: boolean;

	/**
	 * Uses `recaptcha.net` instead of `google.com`.
	 */
	recaptchaNet?: boolean;

	/**
	 * Language code for the widget UI.
	 */
	hl?: string;

	/** Full reCAPTCHA loader URL override. */
	scriptSrc?: string;
}

function buildGoogleRecaptchaScriptSrc({
	siteKey,
	enterprise,
	recaptchaNet,
	hl,
}: Omit<GoogleRecaptchaOptions, 'scriptSrc'>): string {
	let baseUrl = 'https://www.google.com/recaptcha';

	if (recaptchaNet) {
		baseUrl = 'https://www.recaptcha.net/recaptcha';
	}

	let scriptPath = 'api.js';

	if (enterprise) {
		scriptPath = 'enterprise.js';
	}

	const url = new URL(`${baseUrl}/${scriptPath}`);
	url.searchParams.set('render', siteKey);

	if (hl) {
		url.searchParams.set('hl', hl);
	}

	return url.toString();
}

/**
 * Creates a Google reCAPTCHA script.
 *
 * @param options - The options for the Google reCAPTCHA script
 * @returns The Google reCAPTCHA script configuration
 */
export function googleRecaptcha({
	siteKey,
	enterprise,
	recaptchaNet,
	hl,
	scriptSrc,
}: GoogleRecaptchaOptions): Script {
	let resolvedScriptSrc = scriptSrc;

	if (!resolvedScriptSrc) {
		resolvedScriptSrc = buildGoogleRecaptchaScriptSrc({
			siteKey,
			enterprise,
			recaptchaNet,
			hl,
		});
	}

	const resolved = resolveManifest(googleRecaptchaManifest, {
		scriptSrc: resolvedScriptSrc,
	});

	return resolved;
}
