import type { Script } from 'c15t';
import { resolveManifest } from '../../resolve';
import { type VendorManifest, vendorManifestContract } from '../../types';

declare global {
	interface Window {
		_paq: unknown[];
	}
}

function stripProtocol(value: string): string {
	return value.replace(/^https?:\/\//, '');
}

function stripTrailingSlash(value: string): string {
	return value.replace(/\/+$/, '');
}

function joinUrl(base: string, path: string): string {
	return `${stripTrailingSlash(base)}/${path.replace(/^\/+/, '')}`;
}

function resolveMatomoOrigin(
	options: MatomoAnalyticsOptions
): string | undefined {
	if (options.matomoUrl) {
		return stripTrailingSlash(options.matomoUrl);
	}

	if (options.cloudId) {
		return `https://cdn.matomo.cloud/${stripTrailingSlash(
			stripProtocol(options.cloudId)
		)}`;
	}

	return undefined;
}

function createMatomoAnalyticsManifest(options: {
	enableConsentMode: boolean;
	enableLinkTracking: boolean;
	disableCookies: boolean;
	trackPageView: boolean;
}): VendorManifest {
	const install: VendorManifest['install'] = [
		{
			type: 'setGlobal',
			name: '_paq',
			value: [],
			ifUndefined: true,
		},
		{
			type: 'pushToQueue',
			queue: '_paq',
			value: ['setTrackerUrl', '{{trackerUrl}}'],
		},
		{
			type: 'pushToQueue',
			queue: '_paq',
			value: ['setSiteId', '{{siteId}}'],
		},
	];

	if (options.enableLinkTracking) {
		install.push({
			type: 'pushToQueue',
			queue: '_paq',
			value: ['enableLinkTracking'],
		});
	}

	if (options.disableCookies) {
		install.push({
			type: 'pushToQueue',
			queue: '_paq',
			value: ['disableCookies'],
		});
	}

	if (options.enableConsentMode) {
		install.push({
			type: 'pushToQueue',
			queue: '_paq',
			value: ['requireConsent'],
		});
	}

	if (options.trackPageView && !options.enableConsentMode) {
		install.push({
			type: 'pushToQueue',
			queue: '_paq',
			value: ['trackPageView'],
		});
	}

	install.push({
		type: 'loadScript',
		src: '{{scriptUrl}}',
		async: true,
	});

	const onBeforeLoadGranted: VendorManifest['onBeforeLoadGranted'] = [];
	if (options.enableConsentMode) {
		onBeforeLoadGranted.push({
			type: 'pushToQueue',
			queue: '_paq',
			value: ['setConsentGiven'],
		});
	}
	if (options.trackPageView && options.enableConsentMode) {
		onBeforeLoadGranted.push({
			type: 'pushToQueue',
			queue: '_paq',
			value: ['trackPageView'],
		});
	}

	const onConsentGranted: VendorManifest['onConsentGranted'] = [];
	const onConsentDenied: VendorManifest['onConsentDenied'] = [];
	if (options.enableConsentMode) {
		onConsentGranted.push({
			type: 'pushToQueue',
			queue: '_paq',
			value: ['setConsentGiven'],
		});

		if (options.trackPageView) {
			onConsentGranted.push({
				type: 'pushToQueue',
				queue: '_paq',
				value: ['trackPageView'],
			});
		}

		onConsentDenied.push({
			type: 'pushToQueue',
			queue: '_paq',
			value: ['forgetConsentGiven'],
		});
	}

	return {
		...vendorManifestContract,
		vendor: 'matomo-analytics',
		category: 'measurement',
		alwaysLoad: options.enableConsentMode ? true : undefined,
		persistAfterConsentRevoked: options.enableConsentMode ? true : undefined,
		install,
		onBeforeLoadGranted,
		onConsentGranted,
		onConsentDenied,
	};
}

export const matomoAnalyticsManifest = createMatomoAnalyticsManifest({
	enableConsentMode: false,
	enableLinkTracking: false,
	disableCookies: false,
	trackPageView: true,
});

export interface MatomoAnalyticsOptions {
	/** Your Matomo site ID. */
	siteId?: string | number;
	/** Your Matomo base URL, for example `https://analytics.example.com`. */
	matomoUrl?: string;
	/** Your Matomo Cloud identifier, for example `my-site.matomo.cloud`. */
	cloudId?: string;
	/** Optional explicit tracker endpoint override. */
	trackerUrl?: string;
	/** Optional explicit script URL override. */
	scriptUrl?: string;
	/** Queue `enableLinkTracking`. */
	enableLinkTracking?: boolean;
	/** Queue `disableCookies`. */
	disableCookies?: boolean;
	/** Queue an initial `trackPageView`. */
	trackPageView?: boolean;
	/** Enable Matomo's consent mode queueing. */
	defaultConsent?: 'required' | 'given';
}

/**
 * Creates a Matomo Analytics script.
 *
 * @param options - The options for the Matomo Analytics script.
 * @returns The Matomo Analytics script configuration.
 */
export function matomoAnalytics(options: MatomoAnalyticsOptions = {}): Script {
	const origin = resolveMatomoOrigin(options);
	let trackerUrl = options.trackerUrl;
	if (!trackerUrl && origin) {
		trackerUrl = joinUrl(origin, 'matomo.php');
	}

	let scriptUrl = options.scriptUrl;
	if (!scriptUrl && origin) {
		scriptUrl = joinUrl(origin, 'matomo.js');
	}

	if (!trackerUrl || !scriptUrl) {
		throw new Error(
			'matomoAnalytics requires `matomoUrl`, `cloudId`, or explicit `trackerUrl` and `scriptUrl` values.'
		);
	}

	const enableConsentMode =
		options.defaultConsent === 'required' || options.defaultConsent === 'given';

	const manifest = createMatomoAnalyticsManifest({
		enableConsentMode,
		enableLinkTracking: options.enableLinkTracking ?? false,
		disableCookies: options.disableCookies ?? false,
		trackPageView: options.trackPageView ?? true,
	});

	return resolveManifest(manifest, {
		siteId: String(options.siteId ?? 1),
		trackerUrl,
		scriptUrl,
	});
}
