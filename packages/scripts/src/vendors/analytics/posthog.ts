import type { Script } from 'c15t';
import { resolveManifest } from '../../resolve';
import { type VendorManifest, vendorManifestContract } from '../../types';

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
			capture: (event: string, properties?: Record<string, unknown>) => void;
		};
	}
}

const DEFAULT_API_HOST = 'https://eu.i.posthog.com';
const DEFAULT_SCRIPT_URL = 'https://eu-assets.i.posthog.com/static/array.js';
const DEFAULTS_DATE = '2026-01-30';

/**
 * PostHog vendor manifest.
 *
 * PostHog manages its own consent internally via opt_in/opt_out capturing.
 * The script always loads, and consent is toggled via the PostHog API.
 */
export const posthogManifest = {
	...vendorManifestContract,
	vendor: 'posthog',
	category: 'measurement',
	alwaysLoad: true,
	bootstrap: [
		{
			type: 'setGlobal',
			name: 'posthog',
			value: {},
			ifUndefined: true,
		},
		{
			type: 'defineGlobalMethods',
			target: 'posthog',
			methods: [
				{ name: 'init', behavior: 'noop' },
				{ name: 'capture', behavior: 'noop' },
				{ name: 'opt_in_capturing', behavior: 'noop' },
				{ name: 'opt_out_capturing', behavior: 'noop' },
				{
					name: 'get_explicit_consent_status',
					behavior: 'return',
					value: 'pending',
				},
			],
		},
	],
	install: [
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
	onLoadGranted: [
		{
			type: 'callGlobal',
			global: 'posthog',
			method: 'opt_in_capturing',
		},
	],
	onLoadDenied: [
		{
			type: 'callGlobal',
			global: 'posthog',
			method: 'opt_out_capturing',
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
	apiHost?: string;

	/** The PostHog array loader URL. */
	scriptUrl?: string;

	/** PostHog init options passed to `posthog.init(...)`. */
	initOptions?: Record<string, unknown>;
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
	const apiHost = options.apiHost ?? DEFAULT_API_HOST;
	const resolved = resolveManifest(posthogManifest, {
		id: options.id,
		apiHost,
		scriptUrl: options.scriptUrl ?? DEFAULT_SCRIPT_URL,
		initOptions: {
			api_host: apiHost,
			defaults: DEFAULTS_DATE,
			cookieless_mode: 'on_reject',
			...options.initOptions,
		},
	});

	return resolved;
}
