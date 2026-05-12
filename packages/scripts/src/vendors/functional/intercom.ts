import type { Script } from 'c15t';
import { resolveManifest } from '../../resolve';
import { type VendorManifest, vendorManifestContract } from '../../types';

export const INTERCOM_API_BASES = {
	us: 'https://api-iam.intercom.io',
	eu: 'https://api-iam.eu.intercom.io',
	au: 'https://api-iam.au.intercom.io',
} as const;

export type IntercomApiBase =
	| (typeof INTERCOM_API_BASES)[keyof typeof INTERCOM_API_BASES]
	| (string & {});

export type IntercomThemeMode = 'light' | 'dark' | 'system';

export interface IntercomAvatar {
	type: 'avatar';
	image_url: string;
}

export interface IntercomCompany {
	id?: string;
	company_id?: string;
	name?: string;
	created_at?: number;
	remote_created_at?: number;
	plan?: string;
	monthly_spend?: number;
	size?: number;
	website?: string;
	industry?: string;
	[key: string]: unknown;
}

export interface IntercomSettings extends Record<string, unknown> {
	app_id: string;
	api_base: IntercomApiBase;
	custom_launcher_selector?: string;
	alignment?: 'left' | 'right';
	vertical_padding?: number;
	horizontal_padding?: number;
	z_index?: number;
	hide_default_launcher?: boolean;
	hide_notifications?: boolean;
	theme_mode?: IntercomThemeMode;
	session_duration?: number;
	action_color?: string;
	background_color?: string;
	link_color?: string;
	email?: string;
	user_id?: string;
	created_at?: number;
	name?: string;
	phone?: string;
	unsubscribed_from_emails?: boolean;
	language_override?: string;
	utm_campaign?: string;
	utm_content?: string;
	utm_medium?: string;
	utm_source?: string;
	utm_term?: string;
	avatar?: IntercomAvatar;
	user_hash?: string;
	company?: IntercomCompany;
	companies?: IntercomCompany[];
	page_title?: string;
}

export type IntercomCustomSettings = Partial<
	Omit<IntercomSettings, 'app_id' | 'api_base'>
> &
	Record<string, unknown>;

declare global {
	interface Window {
		Intercom: ((...args: unknown[]) => void) & {
			q?: unknown[][];
		};
		intercomSettings?: IntercomSettings;
	}
}

/**
 * Intercom vendor manifest.
 *
 * Seeds `window.intercomSettings` and a queueing `Intercom` stub before loading
 * the messenger widget bundle.
 */
export const intercomManifest = {
	...vendorManifestContract,
	vendor: 'intercom',
	category: 'functionality',
	install: [
		{
			type: 'defineStubFunction',
			name: 'Intercom',
			queue: {
				property: 'q',
			},
			queueFormat: 'array',
			ifUndefined: true,
		},
		{
			type: 'setGlobal',
			name: 'intercomSettings',
			value: '{{settings}}',
			ifUndefined: false,
		},
		{
			type: 'loadScript',
			src: '{{scriptSrc}}',
			async: true,
		},
	],
} as const satisfies VendorManifest;

export interface IntercomOptions {
	/**
	 * Your Intercom app ID.
	 */
	appId: string;

	/**
	 * Regional Intercom API base.
	 *
	 * @default 'https://api-iam.intercom.io'
	 */
	apiBase?: IntercomApiBase;

	/**
	 * Additional serializable Intercom settings merged into
	 * `window.intercomSettings`.
	 */
	settings?: IntercomCustomSettings;

	/** Intercom loader URL. */
	scriptSrc?: string;
}

/**
 * Creates an Intercom messenger script.
 *
 * The helper bootstraps the documented Intercom settings object and queues
 * early `Intercom(...)` calls until the messenger bundle loads.
 *
 * @param options - The options for the Intercom script.
 * @returns The Intercom script configuration.
 *
 * @example
 * ```ts
 * const intercomScript = intercom({
 * 	appId: 'abc123',
 * });
 * ```
 *
 * @see {@link https://developers.intercom.com/installing-intercom/web/installation} Intercom installation documentation.
 */
export function intercom({
	appId,
	apiBase = INTERCOM_API_BASES.us,
	settings,
	scriptSrc,
}: IntercomOptions): Script {
	return resolveManifest(intercomManifest, {
		settings: {
			...(settings ?? {}),
			app_id: appId,
			api_base: apiBase,
		},
		scriptSrc: scriptSrc ?? `https://widget.intercom.io/widget/${appId}`,
	});
}
