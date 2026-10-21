import type { Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { readId, skipMissingId } from '../_shared/required-id';
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
		{ name: '_elqQ', type: 'setGlobal', value: [] },
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
	/** Custom or proxied loader URL. */
	scriptUrl?: string;
}

/**
 * Loads Eloqua and enables page tracking only after consent.
 * Keep reloadOnConsentRevoked enabled. Eloqua opt-out does not stop its
 * runtime or cancel an outstanding opt-in response.
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
	const firstPartyCookieDomain = trimToUndefined(
		options.firstPartyCookieDomain
	);
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
		scriptUrl: resolveScriptUrl(
			options.scriptUrl,
			'https://img.en25.com/i/elqCfg.min.js'
		),
		siteId,
	});
	let hasConsent = false;
	let loaded = false;
	let generation = 0;
	let startedGeneration = -1;
	let cancelOptIn: (() => void) | undefined;
	const grant = (element: HTMLScriptElement | undefined): void => {
		if (
			!loaded ||
			!hasConsent ||
			!element?.isConnected ||
			startedGeneration === generation
		) {
			return;
		}
		startedGeneration = generation;
		const currentGeneration = generation;
		const before = new Set(document.scripts);
		window._elqQ?.push(['elqOptIn']);
		// Eloqua appends its opt-in response script synchronously. Its load event
		// follows response execution, including the first-party OPTIN cookie update.
		const response = Array.from(document.scripts).find((candidate) => {
			if (before.has(candidate) || !candidate.src) {
				return false;
			}
			const url = new URL(candidate.src);
			return (
				url.searchParams.get('pps') === '41' &&
				url.searchParams.get('siteid') === siteId
			);
		});
		if (!response) {
			throw new Error(
				'eloquaTracking: the loader did not create an opt-in response script'
			);
		}
		const handlers = {
			cleanup(): void {
				response.removeEventListener('load', handlers.load);
				response.removeEventListener('error', handlers.cleanup);
				if (cancelOptIn === handlers.cleanup) {
					cancelOptIn = undefined;
				}
			},
			load(): void {
				handlers.cleanup();
				if (
					hasConsent &&
					generation === currentGeneration &&
					element.isConnected
				) {
					window._elqQ?.push(['elqTrackPageView']);
				}
			},
		};
		cancelOptIn = handlers.cleanup;
		response.addEventListener('load', handlers.load, { once: true });
		response.addEventListener('error', handlers.cleanup, { once: true });
	};
	return {
		...script,
		category,
		onBeforeLoad(info) {
			if (hasConsent !== info.hasConsent) {
				generation += 1;
			}
			({ hasConsent } = info);
			if (hasConsent) {
				script.onBeforeLoad?.(info);
			}
		},
		onConsentChange(info) {
			const changed = hasConsent !== info.hasConsent;
			({ hasConsent } = info);
			if (changed) {
				generation += 1;
				cancelOptIn?.();
			}
			script.onConsentChange?.(info);
			if (changed && hasConsent) {
				grant(info.element);
			}
		},
		onDispose() {
			hasConsent = false;
			generation += 1;
			cancelOptIn?.();
		},
		onLoad(info) {
			loaded = true;
			if (info.hasConsent) {
				grant(info.element);
			}
		},
		serverStart: undefined,
	};
};
