import type { Script, ScriptCallbackInfo } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { readId, skipMissingId } from '../_shared/required-id';
import { createScriptReuse } from '../_shared/reuse-script';
import { resolveScriptUrl, trimToUndefined } from '../_shared/script-url';

declare global {
	interface Window {
		_elqQ?: { push: (...commands: unknown[][]) => unknown };
	}
}

/** Eloqua's asynchronous tracking queue. */
export const eloquaTrackingManifest = {
	...vendorManifestContract,
	category: 'marketing',
	install: [
		{ ifUndefined: false, name: '_elqQ', type: 'setGlobal', value: [] },
		{
			queue: '_elqQ',
			type: 'pushToQueue',
			value: ['elqSetSiteId', '{{siteId}}'],
		},
		{ async: true, src: '{{scriptUrl}}', type: 'loadScript' },
	],
	onConsentDenied: [
		{
			args: [['elqOptOut']],
			global: '_elqQ',
			method: 'push',
			type: 'callGlobal',
		},
	],
	persistAfterConsentRevoked: true,
	vendor: 'oracle-eloqua',
	vendorDetails: {
		homepageUrl: 'https://www.oracle.com/cx/marketing/automation/',
		legalName: 'Oracle Corporation',
		name: 'Oracle Eloqua',
		privacyPolicyUrl: 'https://www.oracle.com/legal/privacy/',
	},
} as const satisfies VendorManifest;

export interface EloquaTrackingOptions {
	/** Eloqua site ID from the installation snippet. */
	siteId: string | number;
	/** First-party tracking hostname configured in Eloqua. */
	firstPartyCookieDomain?: string;
	/** Consent condition required before loading. @default 'marketing' */
	category?: Script['category'];
	/** Custom loader URL. Must preserve Eloqua's consent response scripts. */
	scriptUrl?: string;
}

interface ConsentOwner {
	hasConsent: boolean;
	loaded: boolean;
	track: (dispatcher: NonNullable<Window['_elqQ']>) => void;
}

// Keep one consent request in flight, including across provider remounts.
// A response can update OPTIN before its load event, so removing its handlers
// cannot cancel it. Reconcile the latest choice after that response completes.
const createConsentDispatcher = (siteId: string, onIdle: () => void) => {
	const owners = new Set<ConsentOwner>();
	let dispatcher: Window['_elqQ'];
	let desired = false;
	let pending = false;
	let settledDispatcher: Window['_elqQ'];
	let settledConsent: boolean | undefined;
	const permitted = (): boolean =>
		owners.size > 0 && [...owners].every((owner) => owner.hasConsent);
	const retire = (): void => {
		if (owners.size === 0 && !pending) {
			onIdle();
		}
	};
	const reconcile = (): void => {
		if (!dispatcher || pending) {
			return;
		}
		if (settledDispatcher === dispatcher && settledConsent === desired) {
			return;
		}
		const currentDispatcher = dispatcher;
		const requested = desired;
		const before = new Set(document.scripts);
		currentDispatcher.push([requested ? 'elqOptIn' : 'elqOptOut']);
		const response = Array.from(document.scripts).find((candidate) => {
			if (before.has(candidate) || !candidate.src) {
				return false;
			}
			const url = new URL(candidate.src);
			return (
				url.searchParams.get('pps') === (requested ? '41' : '42') &&
				url.searchParams.get('siteid') === siteId
			);
		});
		if (!response) {
			throw new Error(
				'eloquaTracking: the loader did not create a consent response script'
			);
		}
		pending = true;
		const complete = (event: Event): void => {
			response.removeEventListener('load', complete);
			response.removeEventListener('error', complete);
			pending = false;
			settledDispatcher = currentDispatcher;
			settledConsent = requested;
			if (
				event.type === 'load' &&
				requested &&
				desired &&
				dispatcher === currentDispatcher
			) {
				const owner = [...owners]
					.reverse()
					.find((candidate) => candidate.loaded);
				owner?.track(currentDispatcher);
			}
			reconcile();
			retire();
		};
		response.addEventListener('load', complete, { once: true });
		response.addEventListener('error', complete, { once: true });
	};
	return {
		release(owner: ConsentOwner): void {
			owners.delete(owner);
			desired =
				permitted() && [...owners].some((candidate) => candidate.loaded);
			reconcile();
			retire();
		},
		update(owner: ConsentOwner, nextDispatcher?: Window['_elqQ']): void {
			owners.add(owner);
			dispatcher = nextDispatcher ?? dispatcher;
			desired =
				permitted() && [...owners].some((candidate) => candidate.loaded);
			reconcile();
		},
	};
};

// Weak script reservations can disappear while a response still writes cookies.
// Retain account coordination until its owners and outstanding responses finish.
const consentDispatchers = new WeakMap<
	Document,
	Map<string, ReturnType<typeof createConsentDispatcher>>
>();
const getConsentDispatcher = (siteId: string) => {
	let entries = consentDispatchers.get(document);
	if (!entries) {
		entries = new Map();
		consentDispatchers.set(document, entries);
	}
	let dispatcher = entries.get(siteId);
	if (!dispatcher) {
		const accounts = entries;
		dispatcher = createConsentDispatcher(siteId, () => accounts.delete(siteId));
		entries.set(siteId, dispatcher);
	}
	return dispatcher;
};

const reuseEloquaTracking = createScriptReuse<EloquaTrackingOptions>();

/**
 * Loads Eloqua and enables page tracking only after consent.
 * Keep reloadOnConsentRevoked enabled. Eloqua opt-out does not stop its
 * runtime or cancel an outstanding consent response.
 * @param options - Site ID and first-party cookie configuration.
 * @returns The gated Eloqua script, or an inactive script for a missing ID.
 * @example eloquaTracking({ siteId: '123456' });
 * @see https://docs.oracle.com/en/cloud/saas/marketing/eloqua-user/Help/EloquaAsynchronousTrackingScripts/Tasks/BasicPageTracking.htm
 */
export const eloquaTracking = function eloquaTracking(
	options: EloquaTrackingOptions
): Script {
	const category = options?.category ?? 'marketing';
	const siteId = readId(options?.siteId);
	if (!siteId) {
		return skipMissingId('eloquaTracking', 'siteId', {
			category,
			manifest: eloquaTrackingManifest,
		});
	}
	const effectiveOptions = {
		category,
		firstPartyCookieDomain: trimToUndefined(
			options.firstPartyCookieDomain
		)?.toLowerCase(),
		scriptUrl: resolveScriptUrl(
			options.scriptUrl,
			'https://img.en25.com/i/elqCfg.min.js'
		),
		siteId,
	};
	return reuseEloquaTracking(effectiveOptions, (config) => {
		let consent: ReturnType<typeof getConsentDispatcher> | undefined;
		const { firstPartyCookieDomain } = config;
		const manifest: VendorManifest = firstPartyCookieDomain
			? {
					...eloquaTrackingManifest,
					install: [
						...eloquaTrackingManifest.install,
						{
							queue: '_elqQ',
							type: 'pushToQueue',
							value: ['elqUseFirstPartyCookie', '{{firstPartyCookieDomain}}'],
						},
					],
				}
			: eloquaTrackingManifest;
		const script = resolveManifest(manifest, {
			firstPartyCookieDomain,
			scriptUrl: config.scriptUrl,
			siteId,
		});
		let hasConsent = false;
		let initialized = false;
		let loaded = false;
		let generation = 0;
		let trackedGeneration = -1;
		let element: HTMLScriptElement | undefined;
		const track = (dispatcher: NonNullable<Window['_elqQ']>): void => {
			if (
				hasConsent &&
				element?.isConnected &&
				trackedGeneration !== generation
			) {
				trackedGeneration = generation;
				dispatcher.push(['elqTrackPageView', window.location.href]);
			}
		};
		const owner: ConsentOwner = { hasConsent, loaded, track };
		const updateConsent = (dispatcher?: Window['_elqQ']): void => {
			consent ??= getConsentDispatcher(siteId);
			Object.assign(owner, { hasConsent, loaded });
			consent.update(owner, dispatcher);
		};
		const initialize = (info: ScriptCallbackInfo): void => {
			if (info.element && info.element !== element) {
				({ element } = info);
				initialized = false;
				loaded = false;
				generation += 1;
			}
			if (initialized || !hasConsent || !element) {
				return;
			}
			initialized = true;
			script.onBeforeLoad?.(info);
			element.src = script.src ?? '';
		};
		return {
			...script,
			category: config.category ?? 'marketing',
			observeConsentBeforeLoad: true,
			onBeforeLoad(info) {
				if (hasConsent !== info.hasConsent) {
					generation += 1;
				}
				({ hasConsent } = info);
				initialize(info);
				updateConsent();
				if (!initialized) {
					info.element?.removeAttribute('src');
				}
			},
			onConsentChange(info) {
				if (hasConsent !== info.hasConsent) {
					generation += 1;
				}
				({ hasConsent } = info);
				initialize(info);
				updateConsent();
			},
			onDispose() {
				hasConsent = false;
				generation += 1;
				consent?.release(owner);
			},
			onLoad(info) {
				if (initialized) {
					loaded = true;
					element = info.element ?? element;
					updateConsent(window._elqQ);
				}
			},
			serverStart: undefined,
		};
	});
};
