import type { Script, ScriptCallbackInfo } from '@c15t/core';

import type { IntegrationConsentCondition } from '../../registry';
import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { readId, skipMissingId } from '../_shared/required-id';
import { trimToUndefined } from '../_shared/script-url';

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
const warnedLoaders = new WeakSet<Element>();

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
	 * Used only without a non-blank `scriptUrl` override. Invalid values log an
	 * error and use the region-independent host.
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

const hasLostConsent = function hasLostConsent(
	previous: HubSpotConsent,
	next: HubSpotConsent
): boolean {
	return (
		(previous.advertisement && !next.advertisement) ||
		(previous.analytics && !next.analytics) ||
		(previous.functionality && !next.functionality)
	);
};

interface HubSpotInstallation {
	portalId: string;
	src: string;
	nonce: string | undefined;
}

interface HubSpotOwner {
	chat: boolean;
	info: ScriptCallbackInfo;
}

const controllers = new WeakMap<Window, ReturnType<typeof createController>>();

const sameConsent = (left: HubSpotConsent, right: HubSpotConsent) =>
	left.advertisement === right.advertisement &&
	left.analytics === right.analytics &&
	left.functionality === right.functionality;

const currentInfo = (info: ScriptCallbackInfo): ScriptCallbackInfo =>
	info.getCurrentConsent?.() ?? info;

const createController = (host: Window, installation: HubSpotInstallation) => {
	const owners = new Map<symbol, Map<symbol, HubSpotOwner>>();
	const rejected = new Set<symbol>();
	let consent = DENIED_CONSENT;
	let started = false;
	let revision = 0;
	let client: HubSpotConversationsClient | undefined;
	let ready: (() => void) | undefined;
	let widgetLoaded: (() => void) | undefined;
	let chatRequested = false;
	let chatClearPending = false;
	// remove() has no cancellation handle. Retain in-flight knowledge even
	// after the last registration leaves, until that client's completion.
	const pendingClients = new WeakSet<HubSpotConversationsClient>();
	let externalConflict = false;
	let finishing = 0;
	let loadSuspensions = 0;

	const aggregate = () => {
		const active = [...owners.values()].flatMap((entries) => [
			...entries.values(),
		]);
		const states = active.map((owner) => currentInfo(owner.info));
		return {
			chat: active.some((owner) => owner.chat),
			consent:
				finishing || states.length === 0
					? DENIED_CONSENT
					: states.map(consentFor).reduce((left, right) => ({
							advertisement: left.advertisement && right.advertisement,
							analytics: left.analytics && right.analytics,
							functionality: left.functionality && right.functionality,
						})),
			gate:
				!finishing &&
				states.length > 0 &&
				states.every(
					(info) => info.hasConsent && info.vendor?.granted !== false
				),
		};
	};

	const allowsChat = (state: ReturnType<typeof aggregate>) =>
		state.chat && state.gate && state.consent.functionality;
	const removeChat = (conversations: HubSpotConversationsClient) => {
		const latest = aggregate();
		chatClearPending = false;
		if (!latest.chat || allowsChat(latest)) {
			return;
		}
		chatRequested = false;
		conversations.widget.remove();
		conversations.clear({ resetWidget: false });
	};

	const detachChat = () => {
		const previousReady = ready;
		const previousListener = widgetLoaded;
		const previousClient = client;
		ready = undefined;
		widgetLoaded = undefined;
		client = undefined;
		if (previousReady) {
			const index = host.hsConversationsOnReady?.indexOf(previousReady) ?? -1;
			if (index !== -1) {
				host.hsConversationsOnReady?.splice(index, 1);
			}
		}
		if (previousListener) {
			previousClient?.off('widgetLoaded', previousListener);
		}
	};

	const loaderAvailable = () => {
		if (externalConflict) {
			return false;
		}
		const existing = host.document.getElementById('hs-script-loader');
		if (!existing) {
			return true;
		}
		if (!(existing instanceof HTMLScriptElement)) {
			if (!warnedLoaders.has(existing)) {
				warnedLoaders.add(existing);
				console.warn(
					'hubspot: #hs-script-loader belongs to a non-script element. HubSpot will not load; remove or rename the conflicting ID.'
				);
			}
			return false;
		}
		if (
			existing.src !== installation.src ||
			(installation.nonce !== undefined &&
				existing.nonce !== installation.nonce)
		) {
			externalConflict = true;
			if (!warnedLoaders.has(existing)) {
				warnedLoaders.add(existing);
				console.warn(
					'hubspot: #hs-script-loader has an incompatible URL or nonce. Consent forwarding and automatic chat will not start. Remove the other installation and reload.'
				);
			}
			return false;
		}
		if (!ownedLoaders.has(existing) && !warnedLoaders.has(existing)) {
			warnedLoaders.add(existing);
			console.warn(
				'hubspot: #hs-script-loader already exists. Reusing it; remove other HubSpot installations to keep loading consent-gated.'
			);
		}
		return true;
	};

	const ensureLoader = () => {
		if (
			!aggregate().gate ||
			!loaderAvailable() ||
			host.document.getElementById('hs-script-loader')
		) {
			return;
		}
		const element = host.document.createElement('script');
		element.async = true;
		element.defer = true;
		element.id = 'hs-script-loader';
		element.src = installation.src;
		if (installation.nonce) {
			element.nonce = installation.nonce;
		}
		ownedLoaders.add(element);
		host.document.head.appendChild(element);
	};

	const syncChat = (refresh: () => void, allowLoad: boolean) => {
		const token = revision;
		if (!started) {
			return;
		}
		const state = aggregate();
		if (!state.chat) {
			detachChat();
			return;
		}
		const conversations = host.HubSpotConversations;
		if (!conversations) {
			if (!ready) {
				const callback = () => {
					if (ready !== callback || !started) {
						return;
					}
					const index = host.hsConversationsOnReady?.indexOf(callback) ?? -1;
					if (index !== -1) {
						host.hsConversationsOnReady?.splice(index, 1);
					}
					ready = undefined;
					refresh();
				};
				ready = callback;
				host.hsConversationsOnReady ??= [];
				host.hsConversationsOnReady.push(callback);
			}
			return;
		}
		if (client !== conversations) {
			const previousListener = widgetLoaded;
			const previousClient = client;
			widgetLoaded = undefined;
			client = undefined;
			if (previousListener) {
				previousClient?.off('widgetLoaded', previousListener);
			}
			if (revision !== token || !started) {
				return;
			}
			client = conversations;
			chatRequested = false;
			// A retained client may have emitted widgetLoaded before attachment.
			chatClearPending = true;
			const callback = () => {
				if (widgetLoaded !== callback || client !== conversations || !started) {
					return;
				}
				pendingClients.delete(conversations);
				const latest = aggregate();
				if (latest.chat && !allowsChat(latest)) {
					removeChat(conversations);
				} else if (allowsChat(latest)) {
					chatRequested = true;
				}
			};
			widgetLoaded = callback;
			conversations.on('widgetLoaded', callback);
			if (revision !== token || !started) {
				return;
			}
		}
		if (chatClearPending) {
			removeChat(conversations);
		}
		if (revision !== token || !started) {
			return;
		}
		const latest = aggregate();
		if (
			allowLoad &&
			allowsChat(latest) &&
			!chatRequested &&
			!pendingClients.has(conversations)
		) {
			chatRequested = true;
			pendingClients.add(conversations);
			conversations.widget.load();
		}
	};

	const canStart = (gate: boolean, allowLoad: boolean) =>
		allowLoad && gate && loaderAvailable();
	const reconcile = (force: boolean, allowLoad = true) => {
		const canLoad = allowLoad && loadSuspensions === 0;
		let sendConsent = force;
		revision += 1;
		const token = revision;
		const next = aggregate();
		if (!started) {
			if (!canStart(next.gate, canLoad)) {
				return;
			}
			started = true;
			host.disableHubSpotCookieBanner = true;
			host._hsq ??= new Array<unknown[]>();
			host._hsp ??= new Array<unknown[]>();
			host.hsConversationsSettings = {
				...host.hsConversationsSettings,
				loadImmediately: false,
			};
			sendConsent = true;
		}
		const changed = !sameConsent(consent, next.consent);
		const revoke = hasLostConsent(consent, next.consent);
		chatClearPending ||=
			next.chat && consent.functionality && !next.consent.functionality;
		// Commit state before calling APIs that can synchronously change consent
		// or dispose a registration. Every privileged effect rereads the gate.
		const { consent: nextConsent } = next;
		consent = nextConsent;
		const isCurrent = () => {
			if (revision !== token) {
				return false;
			}
			const latest = aggregate();
			if (
				!sameConsent(latest.consent, next.consent) ||
				latest.gate !== next.gate ||
				latest.chat !== next.chat
			) {
				reconcile(false, canLoad);
				return false;
			}
			return true;
		};
		if (revoke) {
			host._hsp?.push(['revokeCookieConsent']);
		}
		if (!isCurrent()) {
			return;
		}
		if (changed || sendConsent) {
			host._hsp?.push(['setHubSpotConsent', { ...consent }]);
		}
		if (!isCurrent()) {
			return;
		}
		syncChat(() => reconcile(false), canLoad);
		if (!isCurrent()) {
			return;
		}
		if (canLoad) {
			ensureLoader();
		}
	};

	return {
		release(config: symbol, registration: symbol, info: ScriptCallbackInfo) {
			const registrations = owners.get(config);
			const owner = registrations?.get(registration);
			if (!owner) {
				return;
			}
			owner.info = info;
			const isFinalOwner = () =>
				owners.size === 1 &&
				registrations?.size === 1 &&
				registrations.has(registration);
			let final = isFinalOwner();
			// Disposal can observe a queued grant. Apply withdrawal, but start no
			// new work until the departing registration has been released.
			loadSuspensions += 1;
			if (final) {
				finishing += 1;
			}
			reconcile(final, false);
			if (!final && isFinalOwner()) {
				final = true;
				finishing += 1;
				reconcile(true, false);
			}
			registrations?.delete(registration);
			if (registrations?.size === 0) {
				owners.delete(config);
			}
			if (final) {
				finishing -= 1;
			}
			if (owners.size === 0) {
				started = false;
				chatRequested = false;
				detachChat();
			}
			if (info.replacing === true) {
				// The incoming registration will supply its own gate. Keep this
				// restriction through synchronous callbacks from consent commands.
				reconcile(false, false);
				if (info.afterReplacement) {
					info.afterReplacement(() => {
						loadSuspensions -= 1;
						reconcile(false);
					});
					return;
				}
			}
			loadSuspensions -= 1;
			if (owners.size > 0 && info.replacing !== true) {
				reconcile(false);
			}
		},
		update(
			config: symbol,
			registration: symbol,
			settings: HubSpotInstallation,
			chat: boolean,
			info: ScriptCallbackInfo
		) {
			if (
				settings.portalId !== installation.portalId ||
				settings.src !== installation.src ||
				(settings.nonce !== undefined && settings.nonce !== installation.nonce)
			) {
				if (!rejected.has(config)) {
					rejected.add(config);
					console.warn(
						'hubspot: conflicting portal, loader URL or explicit nonce. Keep one compatible HubSpot installation per page; reload to change it. This configuration will not control the installed SDK.'
					);
				}
				return;
			}
			let registrations = owners.get(config);
			if (!registrations) {
				registrations = new Map();
				owners.set(config, registrations);
			}
			registrations.set(registration, { chat, info });
			reconcile(true);
		},
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
 * Remove other HubSpot installations. An existing `hs-script-loader` script is
 * reused only with a compatible URL and nonce. The helper cannot control
 * requests that installation already sent.
 * A non-script element with that ID blocks loading and logs a warning once.
 * Remove or rename the conflicting ID to allow the helper to insert its loader.
 * Wrapped setup runs in the browser after hydration, including returning grants.
 *
 * Missing, blank or non-numeric IDs log `hubspot: missing or invalid portalId`
 * and never load. Keep the returned configuration stable across rerenders.
 * @example hubspot({ chat: true, portalId: '123456', region: 'eu1' });
 * @see https://developers.hubspot.com/docs/api/events/cookie-banner
 */
export const hubspot = function hubspot(options: HubSpotOptions): Script {
	const category = (options?.category ?? 'marketing') as Script['category'];
	const rawPortalId = readId(options?.portalId);
	if (rawPortalId === undefined || !PORTAL_ID_PATTERN.test(rawPortalId)) {
		return skipMissingId('hubspot', 'portalId', {
			category,
			manifest: hubspotManifest,
		});
	}
	const portalId = rawPortalId.replace(/^0+(?=\d)/u, '');
	const script = resolveManifest(hubspotManifest, {
		scriptUrl:
			trimToUndefined(options.scriptUrl) ??
			defaultScriptUrl(portalId, options.region),
	});
	const config = Symbol('hubspot-configuration');
	const fallbackRegistration = Symbol('hubspot-registration');
	const settings = {
		nonce: trimToUndefined(options.nonce),
		portalId,
		src: script.src as string,
	};
	const update = (info: ScriptCallbackInfo) => {
		if (typeof window === 'undefined') {
			return;
		}
		const installation = {
			...settings,
			src: new URL(settings.src, document.baseURI).href,
		};
		let controller = controllers.get(window);
		if (!controller) {
			controller = createController(window, installation);
			controllers.set(window, controller);
		}
		controller.update(
			config,
			info.registration ?? fallbackRegistration,
			installation,
			options.chat === true,
			info
		);
	};
	return {
		...script,
		callbackOnly: true,
		category,
		observeConsentBeforeLoad: true,
		onBeforeLoad(info) {
			update(info);
			script.onBeforeLoad?.(info);
		},
		onConsentChange(info) {
			update(info);
			script.onConsentChange?.(info);
		},
		onDispose(info) {
			if (typeof window === 'undefined') {
				return;
			}
			controllers
				.get(window)
				?.release(config, info.registration ?? fallbackRegistration, info);
			script.onDispose?.(info);
		},
		serverStart: undefined,
	};
};
