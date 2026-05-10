import type { Script } from 'c15t';
import { resolveManifest } from './resolve';
import { type VendorManifest, vendorManifestContract } from './types';

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
		src: '{{scriptSrc}}',
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
			// Re-queue the current page when consent is granted after initial load.
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
		alwaysLoad: options.enableConsentMode,
		persistAfterConsentRevoked: options.enableConsentMode,
		install,
		onBeforeLoadGranted,
		onConsentGranted,
		onConsentDenied,
	};
}

export interface MatomoAnalyticsOptions {
	/**
	 * Your Matomo site ID.
	 * @default 1
	 */
	siteId?: string | number;

	/** Your Matomo base URL, for example `https://analytics.example.com`. */
	matomoUrl?: string;

	/**
	 * Your Matomo Cloud identifier, for example `my-site.matomo.cloud`.
	 * Used only when `matomoUrl` is not provided.
	 */
	cloudId?: string;

	/** Optional explicit tracker endpoint override. */
	trackerUrl?: string;

	/** Optional explicit script URL override. */
	scriptSrc?: string;

	/** Queue `enableLinkTracking`. */
	enableLinkTracking?: boolean;

	/** Queue `disableCookies`. */
	disableCookies?: boolean;

	/**
	 * Queue an initial `trackPageView`.
	 * Only the initial page is handled here; SPA route watchers are out of scope.
	 * @default true
	 */
	trackPageView?: boolean;

	/**
	 * Enable Matomo's consent mode queueing.
	 *
	 * Both `'required'` and `'given'` map to the same manifest behavior here:
	 * c15t's current consent state decides whether `setConsentGiven` is queued
	 * before the loader runs.
	 */
	defaultConsent?: 'required' | 'given';
}

/**
 * Creates a Matomo Analytics script.
 *
 * @param options - The options for the Matomo Analytics script
 * @returns The Matomo Analytics script configuration
 *
 * @example
 * ```ts
 * const matomoAnalyticsScript = matomoAnalytics({
 *   matomoUrl: 'https://analytics.example.com',
 *   siteId: 1,
 * });
 * ```
 *
 * @see {@link https://developer.matomo.org/guides/tracking-javascript-guide} Matomo JavaScript tracking documentation
 */
export function matomoAnalytics(options: MatomoAnalyticsOptions = {}): Script {
	const origin = resolveMatomoOrigin(options);
	const trackerUrl =
		options.trackerUrl ?? (origin ? joinUrl(origin, 'matomo.php') : undefined);
	const scriptSrc =
		options.scriptSrc ?? (origin ? joinUrl(origin, 'matomo.js') : undefined);

	if (!trackerUrl || !scriptSrc) {
		throw new Error(
			'matomoAnalytics requires `matomoUrl`, `cloudId`, or explicit `trackerUrl` and `scriptSrc` values.'
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

	const resolved = resolveManifest(manifest, {
		siteId: String(options.siteId ?? 1),
		trackerUrl,
		scriptSrc,
	});

	return resolved;
}
