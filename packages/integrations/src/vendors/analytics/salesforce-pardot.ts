import type { Script, ScriptCallbackInfo } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { readId, skipMissingId, skipScript } from '../_shared/required-id';
import { createScriptReuse } from '../_shared/reuse-script';
import { resolveScriptUrl } from '../_shared/script-url';

declare global {
	interface Window {
		piAId?: string;
		piCId?: string;
		piHostname?: string;
		piDomain?: string;
		pdt?: ((...args: unknown[]) => void) & { cq?: IArguments[] };
	}
}

/** Account Engagement tracking with its consent queue. */
export const pardotTrackingManifest = {
	...vendorManifestContract,
	category: 'marketing',
	install: [
		{
			ifUndefined: false,
			name: 'piAId',
			type: 'setGlobal',
			value: '{{piAId}}',
		},
		{
			ifUndefined: false,
			name: 'piCId',
			type: 'setGlobal',
			value: '{{piCId}}',
		},
		{
			ifUndefined: false,
			name: 'piDomain',
			type: 'setGlobal',
			value: '{{piDomain}}',
		},
		{
			ifUndefined: false,
			name: 'pdt',
			queue: { property: 'cq' },
			type: 'defineStubFunction',
		},
		{
			args: ['create', '{{piAId}}', '{{piCId}}', '{{piDomain}}'],
			global: 'pdt',
			type: 'callGlobal',
		},
		{ args: ['hideConsentBanner', null], global: 'pdt', type: 'callGlobal' },
		{ args: ['setOptIn', false], global: 'pdt', type: 'callGlobal' },
		{ async: true, src: '{{scriptUrl}}', type: 'loadScript' },
	],
	onConsentDenied: [
		{ args: ['revokeConsent'], global: 'pdt', type: 'callGlobal' },
	],
	onLoadGranted: [
		{ args: ['setOptIn', true], global: 'pdt', type: 'callGlobal' },
		{ args: ['sendPageView'], global: 'pdt', type: 'callGlobal' },
	],
	persistAfterConsentRevoked: true,
	vendor: 'salesforce-pardot',
	vendorDetails: {
		homepageUrl: 'https://www.salesforce.com/marketing/b2b-automation/',
		legalName: 'Salesforce, Inc.',
		name: 'Salesforce Account Engagement',
		privacyPolicyUrl: 'https://www.salesforce.com/company/privacy/',
	},
} as const satisfies VendorManifest;

export interface PardotTrackingOptions {
	/** Account ID from the tracking snippet. */
	piAId: string | number;
	/** Campaign ID from the tracking snippet. */
	piCId: string | number;
	/** Tracker hostname, required for the consent API. */
	piDomain?: string;
	/** Classic tracker hostname. @default 'pi.pardot.com' */
	piHostname?: string;
	/** The consent API must be enabled in Account Engagement. @default 'consent' */
	mode?: 'consent' | 'classic';
	/** Consent condition required before loading. @default 'marketing' */
	category?: Script['category'];
	/** Custom or proxied loader URL. */
	scriptUrl?: string;
}

const reusePardotTracking = createScriptReuse<PardotTrackingOptions>();

interface PardotSdkLifecycle {
	queue: IArguments[];
	queueConsumed: boolean;
	restoreConsent?: () => void;
}

const sdkLifecycles = new WeakMap<Document, PardotSdkLifecycle>();

/**
 * Loads Account Engagement after the mapped consent is granted.
 * @param options - Account, campaign and tracker configuration.
 * @returns A gated script, or an inactive script for missing configuration.
 * @example pardotTracking({ piAId: '123456', piCId: '654321', piDomain: 'go.example.com' });
 * @see https://developer.salesforce.com/docs/marketing/pardot/guide/tracking-and-consent-getting-started.html
 */
export const pardotTracking = function pardotTracking(
	options: PardotTrackingOptions
): Script {
	const category = options?.category ?? 'marketing';
	const skipped = { category, manifest: pardotTrackingManifest };
	const piAId = readId(options?.piAId);
	if (!piAId) {
		return skipMissingId('pardotTracking', 'piAId', skipped);
	}
	const piCId = readId(options.piCId);
	if (!piCId) {
		return skipMissingId('pardotTracking', 'piCId', skipped);
	}
	if (
		![piAId, piCId].every(
			(id) =>
				/^\d+$/u.test(id) && Number.isSafeInteger(Number(id)) && Number(id) > 0
		)
	) {
		return skipScript(
			'pardotTracking: account and campaign IDs must be positive integers from the tracking snippet',
			skipped
		);
	}
	const mode = options.mode ?? 'consent';
	if (mode !== 'consent' && mode !== 'classic') {
		throw new Error("pardotTracking: mode must be 'consent' or 'classic'");
	}
	const domain = readId(
		mode === 'classic'
			? (options.piHostname ?? 'pi.pardot.com')
			: options.piDomain
	)?.toLowerCase();
	if (!domain) {
		return skipMissingId('pardotTracking', 'piDomain', skipped);
	}
	if (!/^[a-z\d](?:[a-z\d.-]*[a-z\d])?$/iu.test(domain)) {
		return skipScript(
			'pardotTracking: tracker domain must be a hostname',
			skipped
		);
	}
	const scriptUrl = resolveScriptUrl(
		options.scriptUrl,
		mode === 'classic'
			? 'https://pi.pardot.com/pd.js'
			: `https://${domain}/pdt.js?aid=${Number(piAId)}`
	);
	const create = (config: PardotTrackingOptions): Script => {
		const manifest: VendorManifest =
			mode === 'classic'
				? {
						...pardotTrackingManifest,
						install: [
							{
								ifUndefined: false,
								name: 'piAId',
								type: 'setGlobal',
								value: '{{piAId}}',
							},
							{
								ifUndefined: false,
								name: 'piCId',
								type: 'setGlobal',
								value: '{{piCId}}',
							},
							{
								ifUndefined: false,
								name: 'piHostname',
								type: 'setGlobal',
								value: '{{piDomain}}',
							},
							{ async: true, src: '{{scriptUrl}}', type: 'loadScript' },
						],
						onConsentDenied: [],
						onLoadGranted: [],
						persistAfterConsentRevoked: undefined,
					}
				: pardotTrackingManifest;
		const script = resolveManifest(manifest, {
			piAId: Number(piAId),
			piCId: Number(piCId),
			piDomain: domain,
			scriptUrl,
		});
		if (mode === 'classic') {
			return { ...script, category: config.category ?? 'marketing' };
		}
		let hasConsent = false;
		let loaded = false;
		let started = false;
		let sdkLifecycle: PardotSdkLifecycle | undefined;
		const restoreConsent = () => {
			if (loaded && hasConsent && started) {
				window.pdt?.('setOptIn', true);
			}
		};
		const grant = (info: ScriptCallbackInfo): void => {
			if (loaded && hasConsent && info.element?.isConnected && !started) {
				started = true;
				script.onLoad?.(info);
			}
		};
		return {
			...script,
			category: config.category ?? 'marketing',
			onBeforeLoad(info) {
				({ hasConsent } = info);
				if (hasConsent) {
					script.onBeforeLoad?.(info);
					sdkLifecycle = sdkLifecycles.get(document);
					if (!sdkLifecycle) {
						sdkLifecycle = { queue: [], queueConsumed: false };
						sdkLifecycles.set(document, sdkLifecycle);
					}
					sdkLifecycle.queue = window.pdt?.cq?.slice() ?? [];
					sdkLifecycle.queueConsumed = false;
					sdkLifecycle.restoreConsent = restoreConsent;
					const lifecycle = sdkLifecycle;
					// A disposed download can still execute after a replacement loads.
					// Every execution after the first needs its own tracker configuration.
					info.element?.addEventListener(
						'load',
						() => {
							if (lifecycle.queueConsumed) {
								for (const args of lifecycle.queue) {
									window.pdt?.(...Array.from(args));
								}
							}
							lifecycle.queueConsumed = true;
							lifecycle.restoreConsent?.();
						},
						{ once: true }
					);
				}
			},
			onConsentChange(info) {
				({ hasConsent } = info);
				if (!hasConsent) {
					started = false;
				}
				script.onConsentChange?.(info);
				grant(info);
			},
			onDispose() {
				if (sdkLifecycle?.restoreConsent === restoreConsent) {
					sdkLifecycle.restoreConsent = undefined;
				}
			},
			onLoad(info) {
				loaded = true;
				if (info.hasConsent) {
					grant(info);
				}
			},
			serverStart: undefined,
		};
	};
	return mode === 'classic'
		? create(options)
		: reusePardotTracking(
				{
					category,
					piAId: Number(piAId),
					piCId: Number(piCId),
					piDomain: domain,
					scriptUrl,
				},
				create
			);
};
