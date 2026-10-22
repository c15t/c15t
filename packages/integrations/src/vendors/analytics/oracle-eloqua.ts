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
	/** Eloqua site ID. Use one site/domain configuration per page; reload to change it. */
	siteId: string | number;
	/** First-party tracking hostname. Shared providers must use the same domain. */
	firstPartyCookieDomain?: string;
	/** Consent condition required before loading. @default 'marketing' */
	category?: Script['category'];
	/**
	 * Custom loader URL. Consent commands must synchronously append a matching
	 * pps=41/42 script with the installed siteid. Deferred or unmatched responses
	 * block tracking until reload.
	 */
	scriptUrl?: string;
}

const defaultScriptUrl = 'https://img.en25.com/i/elqCfg.min.js';

interface AccountIdentity {
	siteId: string;
	firstPartyCookieDomain?: string;
}

interface ConsentOwner extends AccountIdentity {
	hasConsent: boolean;
	loaded: boolean;
	initialize: () => void;
	invalidateTracking: () => void;
	track: (dispatcher: NonNullable<Window['_elqQ']>) => boolean;
}

interface CapturedDispatcher {
	queue: NonNullable<Window['_elqQ']>;
	synchronous: boolean;
}

const sameAccount = (left: AccountIdentity, right: AccountIdentity): boolean =>
	left.siteId === right.siteId &&
	left.firstPartyCookieDomain === right.firstPartyCookieDomain;

// Removing a tag cannot unload its dispatcher or cancel a detached download.
// A different account therefore needs a new document, even after disposal.
const installedAccounts = new WeakMap<Document, AccountIdentity>();
const failedWithdrawals = new WeakMap<Document, CapturedDispatcher>();

// Keep one consent request in flight, including across provider remounts.
// A response can update OPTIN before its load event, so removing its handlers
// cannot cancel it. Reconcile the latest choice after that response completes.
const createConsentDispatcher = (onIdle: () => void) => {
	const owners = new Set<ConsentOwner>();
	const reportedConflicts = new WeakSet<ConsentOwner>();
	let dispatcher: CapturedDispatcher | undefined;
	let desired = false;
	let pending = false;
	let executions = 0;
	let indeterminate = false;
	let conflicting = false;
	let settledDispatcher: Window['_elqQ'];
	let settledConsent: boolean | undefined;
	const account = (): AccountIdentity | undefined =>
		installedAccounts.get(document) ?? owners.values().next().value;
	const compatible = (owner: AccountIdentity): boolean => {
		const installed = account();
		return !installed || sameAccount(installed, owner);
	};
	const permitted = (): boolean =>
		owners.size > 0 &&
		[...owners].every((owner) => owner.hasConsent && compatible(owner));
	const retire = (): void => {
		if (owners.size === 0 && !pending && executions === 0 && !indeterminate) {
			onIdle();
		}
	};
	const block = (error: unknown): void => {
		indeterminate = true;
		console.error(
			'eloquaTracking: dispatcher failed. Reload before tracking again.',
			error
		);
	};
	const reconcile = (): void => {
		if (!dispatcher || pending || indeterminate) {
			return;
		}
		if (settledDispatcher === dispatcher.queue && settledConsent === desired) {
			return;
		}
		const currentDispatcher = dispatcher;
		const requested = desired;
		const before = new Set(document.scripts);
		let dispatchFailed = false;
		let dispatchError: unknown;
		try {
			currentDispatcher.queue.push([requested ? 'elqOptIn' : 'elqOptOut']);
		} catch (error) {
			dispatchFailed = true;
			dispatchError = error;
		}
		const added = Array.from(document.scripts).filter(
			(candidate) => !before.has(candidate) && candidate.src
		);
		const response = added.find((candidate) => {
			let url: URL;
			try {
				url = new URL(candidate.src);
			} catch {
				return false;
			}
			return (
				url.searchParams.get('pps') === (requested ? '41' : '42') &&
				url.searchParams.get('siteid') === account()?.siteId
			);
		});
		if (!response || dispatchFailed || added.length !== 1) {
			// The stock SDK appends synchronously and swallows insertion errors.
			// An unknown loader may still execute a deferred or unmatched response.
			indeterminate =
				!currentDispatcher.synchronous ||
				added.length > 0 ||
				Array.isArray(currentDispatcher.queue);
			console.error(
				`eloquaTracking: consent dispatch failed; no consent was confirmed.${indeterminate ? ' Reload before tracking again.' : ''}`,
				dispatchError ??
					new Error(
						'The loader did not create one matching consent response script'
					)
			);
			if (!requested && !indeterminate) {
				failedWithdrawals.set(document, currentDispatcher);
			}
			if (!response) {
				return;
			}
		}
		pending = true;
		let completed = false;
		const complete = (event: Event): void => {
			if (completed) {
				return;
			}
			completed = true;
			response.removeEventListener('load', complete);
			response.removeEventListener('error', complete);
			pending = false;
			if (!indeterminate && event.type === 'load') {
				settledDispatcher = currentDispatcher.queue;
				settledConsent = requested;
				if (!requested) {
					failedWithdrawals.delete(document);
				}
			}
			if (!indeterminate && event.type === 'error') {
				settledConsent = undefined;
				if (!requested) {
					failedWithdrawals.set(document, currentDispatcher);
				}
			}
			if (
				!indeterminate &&
				event.type === 'load' &&
				requested &&
				desired &&
				dispatcher === currentDispatcher
			) {
				try {
					for (const candidate of [...owners].reverse()) {
						if (candidate.loaded && candidate.track(currentDispatcher.queue)) {
							break;
						}
					}
				} catch (error) {
					block(error);
				}
			}
			if (
				event.type === 'load' ||
				desired !== requested ||
				dispatcher !== currentDispatcher
			) {
				reconcile();
			}
			retire();
		};
		response.addEventListener('load', complete, { once: true });
		response.addEventListener('error', complete, { once: true });
	};
	const refresh = (): void => {
		if (!permitted()) {
			dispatcher ??= failedWithdrawals.get(document);
		}
		const nextConflicting = [...owners].some((owner) => !compatible(owner));
		if (nextConflicting && !conflicting) {
			for (const owner of owners) {
				owner.invalidateTracking();
			}
		}
		conflicting = nextConflicting;
		for (const owner of owners) {
			if (!compatible(owner) && !reportedConflicts.has(owner)) {
				reportedConflicts.add(owner);
				console.error(
					'eloquaTracking: conflicting site ID or first-party cookie domain. ' +
						'Use one account configuration per page; reload to change it.'
				);
			}
		}
		if (permitted() && !indeterminate) {
			for (const owner of owners) {
				owner.initialize();
			}
		}
		desired = permitted() && [...owners].some((owner) => owner.loaded);
		reconcile();
	};
	return {
		block,
		compatible,
		completeExecution(): void {
			executions -= 1;
			retire();
		},
		release(owner: ConsentOwner): void {
			owners.delete(owner);
			refresh();
			retire();
		},
		start(identity: AccountIdentity): boolean {
			if (!permitted() || !compatible(identity) || indeterminate) {
				return false;
			}
			installedAccounts.set(document, {
				firstPartyCookieDomain: identity.firstPartyCookieDomain,
				siteId: identity.siteId,
			});
			executions += 1;
			return true;
		},
		update(owner: ConsentOwner, nextDispatcher?: CapturedDispatcher): void {
			owners.add(owner);
			if (nextDispatcher && compatible(owner)) {
				dispatcher = nextDispatcher;
			}
			refresh();
		},
	};
};

// All registrations share the physical global SDK, even across site IDs.
const consentDispatchers = new WeakMap<
	Document,
	ReturnType<typeof createConsentDispatcher>
>();
const getConsentDispatcher = () => {
	let dispatcher = consentDispatchers.get(document);
	if (!dispatcher) {
		const ownerDocument = document;
		dispatcher = createConsentDispatcher(() =>
			consentDispatchers.delete(ownerDocument)
		);
		consentDispatchers.set(document, dispatcher);
	}
	return dispatcher;
};

const reuseEloquaTracking = createScriptReuse<EloquaTrackingOptions>();
const initializedElements = new WeakSet<HTMLScriptElement>();
const elementAccounts = new WeakMap<HTMLScriptElement, AccountIdentity>();
const elementDispatchers = new WeakMap<HTMLScriptElement, CapturedDispatcher>();

/**
 * Loads Eloqua and enables page tracking only after consent.
 * Keep reloadOnConsentRevoked enabled. Eloqua opt-out does not stop its
 * runtime or cancel an outstanding consent response. Compatible providers share
 * one installed site/domain. Conflicting providers block tracking until removed;
 * changing the installed account requires reload.
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
		scriptUrl: resolveScriptUrl(options.scriptUrl, defaultScriptUrl),
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
		let latestInfo: ScriptCallbackInfo | undefined;
		const track = (dispatcher: NonNullable<Window['_elqQ']>): boolean => {
			if (
				hasConsent &&
				element?.isConnected &&
				trackedGeneration !== generation
			) {
				dispatcher.push(['elqTrackPageView', window.location.href]);
				trackedGeneration = generation;
				return true;
			}
			return false;
		};
		const captureDispatcher = (loadedElement: HTMLScriptElement) => {
			let dispatcher = elementDispatchers.get(loadedElement);
			const installed = elementAccounts.get(loadedElement);
			if (!dispatcher && window._elqQ && installed) {
				dispatcher = {
					queue: window._elqQ,
					synchronous: config.scriptUrl === defaultScriptUrl,
				};
				try {
					dispatcher.queue.push(['elqSetSiteId', installed.siteId]);
					if (installed.firstPartyCookieDomain) {
						dispatcher.queue.push([
							'elqUseFirstPartyCookie',
							installed.firstPartyCookieDomain,
						]);
					}
				} catch (error) {
					consent?.block(error);
					return;
				}
				elementDispatchers.set(loadedElement, dispatcher);
			}
			return dispatcher;
		};
		const initialize = (info: ScriptCallbackInfo): void => {
			if (info.element && info.element !== element) {
				({ element } = info);
				initialized = initializedElements.has(info.element);
				// Another provider may have completed this tag while setup was blocked.
				loaded = elementDispatchers.has(info.element);
				generation += 1;
			}
			if (
				initialized ||
				!hasConsent ||
				!element ||
				!consent?.start({ firstPartyCookieDomain, siteId })
			) {
				return;
			}
			initialized = true;
			elementAccounts.set(element, { firstPartyCookieDomain, siteId });
			script.onBeforeLoad?.(info);
			initializedElements.add(element);
			const pendingElement = element;
			// Detached downloads can still execute and consume another tag's queue.
			// Configure and capture each actual execution before core's load callback.
			const complete = (event: Event): void => {
				pendingElement.removeEventListener('load', complete);
				pendingElement.removeEventListener('error', complete);
				if (event.type === 'load') {
					captureDispatcher(pendingElement);
				}
				consent?.completeExecution();
			};
			element.addEventListener('load', complete, { once: true });
			element.addEventListener('error', complete, { once: true });
			element.src = script.src ?? '';
		};
		const owner: ConsentOwner = {
			firstPartyCookieDomain,
			hasConsent,
			initialize: () => {
				if (latestInfo) {
					initialize(latestInfo);
					owner.loaded = loaded;
				}
			},
			invalidateTracking: () => {
				generation += 1;
			},
			loaded,
			siteId,
			track,
		};
		const updateConsent = (dispatcher?: CapturedDispatcher): void => {
			consent ??= getConsentDispatcher();
			Object.assign(owner, { hasConsent, loaded });
			consent.update(owner, dispatcher);
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
				latestInfo = info;
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
				latestInfo = info;
				updateConsent();
			},
			onDispose() {
				hasConsent = false;
				loaded = false;
				generation += 1;
				consent?.release(owner);
			},
			onLoad(info) {
				if (initialized && consent?.compatible(owner)) {
					loaded = true;
					element = info.element ?? element;
					updateConsent(element && captureDispatcher(element));
				}
			},
			serverStart: undefined,
		};
	});
};
