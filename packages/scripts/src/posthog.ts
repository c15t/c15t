import type { Script } from 'c15t';
import { applyScriptOverrides, resolveManifest } from './resolve';
import type { VendorManifest } from './types';

declare global {
	interface Window {
		posthog: {
			init: (
				token: string,
				options: {
					api_host: string;
					ui_host?: string;
					autocapture?: boolean;
					[key: string]: unknown;
				}
			) => void;
			opt_in_capturing: () => void;
			opt_out_capturing: () => void;
			get_explicit_consent_status: () => string;
		};
	}
}

/**
 * PostHog vendor manifest.
 *
 * PostHog manages its own consent internally via opt_in/opt_out capturing.
 * The script always loads, and consent is toggled via the PostHog API.
 */
export const posthogManifest = {
	vendor: 'posthog',
	category: 'measurement',
	alwaysLoad: true,
	install: [
		{
			type: 'inlineScript',
			code: `
if (!window.posthog) {
	window.posthog = {
		init: function(){},
		opt_in_capturing: function(){},
		opt_out_capturing: function(){},
		get_explicit_consent_status: function(){ return 'pending'; }
	};
}
			`.trim(),
		},
		{
			type: 'loadScript',
			src: '{{scriptUrl}}',
			async: true,
			attributes: {
				crossorigin: 'anonymous',
				'data-api-host': '{{apiHost}}',
				'data-ui-host': '{{apiHost}}',
			},
		},
	],
	afterLoad: [
		{
			type: 'callGlobal',
			global: 'posthog',
			method: 'init',
			args: ['{{id}}', '{{initOptions}}'],
		},
	],
	onConsentGranted: [
		{
			type: 'callGlobal',
			global: 'posthog',
			method: 'opt_in_capturing',
		},
	],
	onConsentDenied: [
		{
			type: 'callGlobal',
			global: 'posthog',
			method: 'opt_out_capturing',
		},
	],
} as const satisfies VendorManifest;

export interface PosthogConsentOptions {
	/**
	 * Your posthog id, begins with 'phc_'.
	 */
	id: string;

	/**
	 * Your posthog api host.
	 * @default 'https://eu.i.posthog.com'
	 */
	apiHost: string;

	/**
	 * The defaults for the posthog script.
	 */
	defaults: string;

	/**
	 * Other optional options for the posthog script.
	 * @example { person_profiles: 'identified_only' }
	 */
	options: Record<string, unknown>;

	/**
	 * Override or extend the default script values.
	 *
	 * Default values:
	 * - `id`: 'posthog-consent'
	 * - `category`: 'measurement'
	 */
	script?: Partial<Script>;
}

/**
 * Loads the PostHog script and initializes it with the given options.
 * This uses posthog.opt_in_capturing() to opt in to capturing. And posthog.opt_out_capturing() to opt out of capturing.
 * @see https://posthog.com/docs/libraries/js#opt-in-capturing
 *
 * @param options - Optional configuration for the PostHog consent script
 * @returns The Posthog script
 */
export function posthog(options: PosthogConsentOptions): Script {
	const apiHost = options.apiHost;
	const assetsHost = apiHost.replace('.i.posthog.com', '-assets.i.posthog.com');
	const scriptUrl = `${assetsHost}/static/array.js`;

	const initOptions = {
		api_host: apiHost,
		ui_host: apiHost,
		autocapture: false,
		...(options.options || {}),
	};

	const resolved = resolveManifest(posthogManifest, {
		id: options.id,
		apiHost,
		scriptUrl,
		// The initOptions object is passed as a pre-built object rather than template vars
		// because it contains dynamic user options that can't be expressed as simple strings
		initOptions,
	});

	// PostHog's afterLoad needs special handling:
	// The manifest's callGlobal for 'init' receives the initOptions as a string '{{initOptions}}'
	// but we need it as an object. Override onLoad to handle this properly.
	resolved.onLoad = (info) => {
		if (window.posthog && typeof window.posthog.init === 'function') {
			window.posthog.init(options.id, initOptions);

			// Sync consent state after init
			const posthogConsent = window.posthog.get_explicit_consent_status();
			if (info.hasConsent && posthogConsent !== 'granted') {
				window.posthog.opt_in_capturing();
			} else if (!info.hasConsent && posthogConsent !== 'denied') {
				window.posthog.opt_out_capturing();
			}
		}
	};

	// PostHog's consent change also checks current status to avoid redundant calls
	resolved.onConsentChange = (info) => {
		const posthogConsent = window.posthog.get_explicit_consent_status();
		if (info.hasConsent && posthogConsent !== 'granted') {
			window.posthog.opt_in_capturing();
		} else if (!info.hasConsent && posthogConsent !== 'denied') {
			window.posthog.opt_out_capturing();
		}
	};

	return options.script
		? applyScriptOverrides(resolved, options.script)
		: resolved;
}
