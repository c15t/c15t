import { has } from '@c15t/core';
import type { Script, ScriptCallbackInfo } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { runtimeTimestampValue, vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { readId, skipMissingId } from '../_shared/required-id';
import {
	createScriptReuse,
	getScriptRegistrations,
} from '../_shared/reuse-script';

interface ZendeskWidgetApi {
	(...args: unknown[]): void;
	_?: IArguments[];
	s?: HTMLScriptElement;
	t?: number;
}

declare global {
	interface Window {
		zE?: ZendeskWidgetApi;
		zEmbed?: ZendeskWidgetApi;
	}
}

/** Zendesk Messaging loader and the vendor's pre-load command queue. */
export const zendeskWidgetManifest = {
	...vendorManifestContract,
	category: 'functionality',
	install: [
		{
			aliases: ['zEmbed'],
			name: 'zE',
			properties: { t: runtimeTimestampValue },
			queue: { property: '_' },
			queueFormat: 'arguments',
			type: 'defineStubFunction',
		},
		{
			async: true,
			src: '{{scriptSrc}}',
			type: 'loadScript',
		},
	],
	vendor: 'zendesk',
	vendorDetails: {
		homepageUrl: 'https://www.zendesk.com/',
		legalName: 'Zendesk, Inc.',
		name: 'Zendesk Messaging',
		privacyPolicyUrl:
			'https://www.zendesk.com/company/agreements-and-terms/privacy-notice/',
	},
} satisfies VendorManifest;

export interface ZendeskWidgetOptions {
	/** Public widget key from Admin Center > Channels > Messaging > Installation. */
	key: string;
	/** Consent condition required to load the widget. @default 'functionality' */
	category?: Script['category'];
}

const createZendeskScript = (options: ZendeskWidgetOptions): Script => {
	const category = options.category ?? 'functionality';
	const script = resolveManifest(zendeskWidgetManifest, {
		scriptSrc: `https://static.zdassets.com/ekr/snippet.js?key=${encodeURIComponent(options.key)}`,
	});
	let installed = false;

	const grantedRegistrations = (info: ScriptCallbackInfo) =>
		getScriptRegistrations(info).filter(
			// Configuration removal reports hasConsent: false even while granted.
			(state) =>
				state.vendor?.granted !== false && has(category, state.consents)
		);

	const updateCookieRange = (info: ScriptCallbackInfo): void => {
		if (!installed || typeof window === 'undefined') {
			return;
		}
		const granted = grantedRegistrations(info);
		let range: 'all' | 'functional' | 'none' = 'none';
		if (granted.length > 0) {
			range = granted.every((state) => state.consents.measurement)
				? 'all'
				: 'functional';
		}
		window.zE?.('messenger:set', 'cookies', range);
	};

	return {
		...script,
		category,
		onBeforeLoad(info) {
			if (
				grantedRegistrations(info).length === 0 ||
				!info.element ||
				typeof window === 'undefined'
			) {
				return;
			}
			script.onBeforeLoad?.(info);
			if (typeof window.zE !== 'function') {
				return;
			}

			// The official loader reads zE.s when no ze-snippet element exists.
			// Preserve core's DOM ID so load tracking and removal keep working.
			window.zE.s = info.element;
			installed = true;
			updateCookieRange(info);
		},
		onConsentChange: updateCookieRange,
		onDispose() {
			installed = false;
		},
		// The client must attach zE.s and set cookies before the vendor executes.
		serverStart: undefined,
	};
};

const reuseZendeskScript = createScriptReuse<ZendeskWidgetOptions>();

/**
 * Loads Zendesk Messaging after its mapped consent is granted.
 *
 * Queues `functional` storage before the loader runs, or `all` when
 * measurement is also allowed. Revocation sends the documented `none` range
 * once no shared registration permits the widget. Removing a configuration
 * or disposing its loader does not clear a granted conversation. Equal
 * configurations share the active lifecycle across rerenders.
 * Keep `reloadOnConsentRevoked` enabled to unload code already running.
 *
 * @param options - Public widget key and optional consent condition.
 * @returns A consent-gated Zendesk Messaging script.
 * @remarks A missing or blank key logs an error and returns a script that
 * never loads. This helper targets Messaging, not Web Widget Classic.
 * @example
 * zendeskWidget({ key: 'YOUR_ZENDESK_WIDGET_KEY' });
 * @see https://developer.zendesk.com/api-reference/widget-messaging/web/core/#set-cookies
 */
export const zendeskWidget = function zendeskWidget(
	options: ZendeskWidgetOptions
): Script {
	const key = readId(options?.key);
	const category = options?.category ?? 'functionality';
	if (key === undefined) {
		return skipMissingId('zendeskWidget', 'key', {
			category,
			manifest: zendeskWidgetManifest,
		});
	}
	return reuseZendeskScript({ category, key }, createZendeskScript);
};
