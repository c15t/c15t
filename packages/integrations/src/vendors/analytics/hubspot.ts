import type { Script, ScriptCallbackInfo } from '@c15t/core';

import type { IntegrationConsentCondition } from '../../registry';
import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { readId, skipMissingId } from '../_shared/required-id';
import { resolveScriptUrl, trimToUndefined } from '../_shared/script-url';

interface HubSpotConsent {
	advertisement: boolean;
	analytics: boolean;
	functionality: boolean;
}

interface HubSpotCommandQueue {
	push: (command: unknown[]) => unknown;
}

interface HubSpotConversationsClient {
	clear: (options: { resetWidget: boolean }) => void;
	off: (event: 'widgetLoaded', callback: () => void) => void;
	on: (event: 'widgetLoaded', callback: () => void) => void;
	widget: {
		load: () => void;
		remove: () => void;
	};
}

declare global {
	interface Window {
		_hsp?: HubSpotCommandQueue;
		_hsq?: HubSpotCommandQueue;
		disableHubSpotCookieBanner?: boolean;
		HubSpotConversations?: HubSpotConversationsClient;
		hsConversationsOnReady?: (() => void)[];
		hsConversationsSettings?: Record<string, unknown> & {
			loadImmediately?: boolean;
		};
	}
}

const DENIED_CONSENT: HubSpotConsent = {
	advertisement: false,
	analytics: false,
	functionality: false,
};
const PORTAL_ID_PATTERN = /^\d+$/u;
const REGION_PATTERN = /^[a-z]{2}\d+$/u;
const ownedLoaders = new WeakSet<HTMLScriptElement>();
const warnedLoaders = new WeakSet<HTMLScriptElement>();

/** HubSpot's complete loader, gated on marketing consent by default. */
export const hubspotManifest = {
	...vendorManifestContract,
	category: 'marketing',
	install: [
		{
			async: true,
			defer: true,
			src: '{{scriptUrl}}',
			type: 'loadScript',
		},
	],
	persistAfterConsentRevoked: true,
	vendor: 'hubspot',
	vendorDetails: {
		homepageUrl: 'https://www.hubspot.com/',
		legalName: 'HubSpot, Inc.',
		name: 'HubSpot',
		privacyPolicyUrl: 'https://legal.hubspot.com/privacy-policy',
	},
} as const satisfies VendorManifest;

/** Configuration for the HubSpot tracking code and optional chat widget. */
export interface HubSpotOptions {
	/**
	 * Consent condition for the whole loader, including its child scripts.
	 * A weaker condition permits HubSpot requests without marketing consent.
	 * @default 'marketing'
	 */
	category?: IntegrationConsentCondition;
	/**
	 * Explicitly enable chat when functionality and the loader condition allow it.
	 * @default false
	 */
	chat?: boolean;
	/** CSP nonce for the manually inserted HubSpot loader. */
	nonce?: string;
	/** Public numeric Hub ID from the tracking code's script filename. */
	portalId: string | number;
	/**
	 * Lowercase region code from the tracking snippet, such as `na1` or `eu1`.
	 * Invalid values log an error and use the region-independent host.
	 */
	region?: string;
	/**
	 * Custom or proxied loader URL. Blank values use the default regional URL.
	 * Overriding the loader does not proxy HubSpot's child requests.
	 */
	scriptUrl?: string;
}

const defaultScriptUrl = function defaultScriptUrl(
	portalId: string,
	region: string | undefined
): string {
	if (region === undefined) {
		return `https://js.hs-scripts.com/${portalId}.js`;
	}
	if (!REGION_PATTERN.test(region)) {
		console.error('hubspot: invalid region. Using https://js.hs-scripts.com.');
		return `https://js.hs-scripts.com/${portalId}.js`;
	}
	return `https://js-${region}.hs-scripts.com/${portalId}.js`;
};

const consentFor = function consentFor(
	info: ScriptCallbackInfo
): HubSpotConsent {
	if (!info.hasConsent || info.vendor?.granted === false) {
		return DENIED_CONSENT;
	}
	return {
		advertisement: info.consents.marketing === true,
		analytics: info.consents.measurement === true,
		functionality: info.consents.functionality === true,
	};
};

/**
 * Loads HubSpot after marketing consent and forwards c15t's consent categories.
 *
 * @param options - Public portal ID, region, loader condition and chat choice.
 * @returns A consent-gated HubSpot script, or a skipped script for an invalid ID.
 * @remarks
 * No HubSpot globals or queues are created before the loader condition passes.
 * The helper disables HubSpot's banner, forwards measurement as analytics,
 * marketing as advertisement and functionality as functionality before insertion
 * and on changes. Denying the helper condition or vendor denies all three fields.
 *
 * Set `chat: true` to enable chat after functionality consent. The loader remains
 * on revocation to prevent reinjection. Consent signals, cookie revocation and
 * widget removal cannot unload HubSpot's child scripts. Keep c15t's default
 * reload on revocation enabled to stop the current page's running code.
 *
 * Remove other HubSpot installations. An existing `hs-script-loader` element is
 * reused, but the helper cannot control requests that installation already sent.
 * Wrapped setup runs in the browser after hydration, including returning grants.
 *
 * Missing, blank or non-numeric IDs log `hubspot: missing or invalid portalId`
 * and never load. Keep the returned configuration stable across rerenders.
 * @example hubspot({ chat: true, portalId: '123456', region: 'eu1' });
 * @see https://developers.hubspot.com/docs/api/events/cookie-banner
 */
export const hubspot = function hubspot(options: HubSpotOptions): Script {
	const category = (options?.category ?? 'marketing') as Script['category'];
	const portalId = readId(options?.portalId);
	if (portalId === undefined || !PORTAL_ID_PATTERN.test(portalId)) {
		return skipMissingId('hubspot', 'portalId', {
			category,
			manifest: hubspotManifest,
		});
	}
	const script = resolveManifest(hubspotManifest, {
		scriptUrl: resolveScriptUrl(
			trimToUndefined(options.scriptUrl),
			defaultScriptUrl(portalId, options.region)
		),
	});
	let consent = DENIED_CONSENT;
	let started = false;
	let chatRequested = false;
	let chatClearPending = false;
	let readyQueued = false;
	let disposed = false;
	let conversationsClient: HubSpotConversationsClient | undefined;

	const removeChat = (client: HubSpotConversationsClient) => {
		client.widget.remove();
		// resetWidget: true recreates the widget after clearing its cookies.
		client.clear({ resetWidget: false });
		chatClearPending = false;
		chatRequested = false;
	};

	const onWidgetLoaded = () => {
		if (
			conversationsClient &&
			(!consent.functionality || options.chat !== true)
		) {
			removeChat(conversationsClient);
		}
	};

	const syncChat = () => {
		if (disposed) {
			return;
		}
		const conversations = window.HubSpotConversations;
		if (!conversations) {
			return;
		}
		if (conversationsClient !== conversations) {
			conversationsClient?.off('widgetLoaded', onWidgetLoaded);
			conversationsClient = conversations;
			conversations.on('widgetLoaded', onWidgetLoaded);
		}
		if (chatClearPending) {
			removeChat(conversations);
		}
		if (options.chat === true && consent.functionality && !chatRequested) {
			chatRequested = true;
			conversations.widget.load();
		}
	};

	const onConversationsReady = () => {
		readyQueued = false;
		syncChat();
	};

	const updateConsent = (info: ScriptCallbackInfo) => {
		if (disposed) {
			return;
		}
		const next = consentFor(info);
		if (!started && (!info.hasConsent || info.vendor?.granted === false)) {
			return;
		}
		if (!started) {
			started = true;
			window.disableHubSpotCookieBanner = true;
			window._hsq ??= new Array<unknown[]>();
			window._hsp ??= new Array<unknown[]>();
			window.hsConversationsSettings = {
				...window.hsConversationsSettings,
				loadImmediately: false,
			};
		}
		const revokeAnalytics = consent.analytics && !next.analytics;
		chatClearPending ||= consent.functionality && !next.functionality;
		consent = next;
		if (revokeAnalytics) {
			window._hsp?.push(['revokeCookieConsent']);
		}
		// Cookie revocation also denies HubSpot's categories. Restore the actual
		// remaining grants after cleanup, rather than leaving them all denied.
		window._hsp?.push(['setHubSpotConsent', { ...consent }]);
		if (options.chat === true && !window.HubSpotConversations && !readyQueued) {
			window.hsConversationsOnReady ??= [];
			window.hsConversationsOnReady.push(onConversationsReady);
			readyQueued = true;
		}
		syncChat();
	};

	const ensureLoader = (info: ScriptCallbackInfo) => {
		if (!info.hasConsent || info.vendor?.granted === false || disposed) {
			return;
		}
		const existing = document.getElementById('hs-script-loader');
		if (existing) {
			if (
				existing instanceof HTMLScriptElement &&
				(!ownedLoaders.has(existing) || existing.src !== script.src) &&
				!warnedLoaders.has(existing)
			) {
				warnedLoaders.add(existing);
				console.warn(
					'hubspot: #hs-script-loader already exists. Reusing it; remove other HubSpot installations to keep loading consent-gated.'
				);
			}
			return;
		}
		const element = document.createElement('script');
		element.async = true;
		element.defer = true;
		element.id = 'hs-script-loader';
		element.src = script.src as string;
		const nonce = trimToUndefined(options.nonce);
		if (nonce) {
			element.nonce = nonce;
		}
		ownedLoaders.add(element);
		document.head.appendChild(element);
	};

	return {
		...script,
		callbackOnly: true,
		category,
		observeConsentBeforeLoad: true,
		onBeforeLoad(info) {
			disposed = false;
			updateConsent(info);
			script.onBeforeLoad?.(info);
			ensureLoader(info);
		},
		onConsentChange(info) {
			updateConsent(info);
			script.onConsentChange?.(info);
			ensureLoader(info);
		},
		onDispose(info) {
			if (typeof window === 'undefined' || !started) {
				return;
			}
			updateConsent({ ...info, hasConsent: false });
			disposed = true;
			const callbacks = window.hsConversationsOnReady;
			const index = callbacks?.indexOf(onConversationsReady) ?? -1;
			if (callbacks && index !== -1) {
				callbacks.splice(index, 1);
			}
			readyQueued = false;
			conversationsClient?.off('widgetLoaded', onWidgetLoaded);
			script.onDispose?.(info);
		},
		// The wrapper must run before HubSpot; defer startup to the browser loader.
		serverStart: undefined,
	};
};
