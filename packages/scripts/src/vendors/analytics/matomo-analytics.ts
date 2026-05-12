import type { Script } from 'c15t';
import { resolveManifest } from '../../resolve';
import { type VendorManifest, vendorManifestContract } from '../../types';
import { joinUrlPath } from '../_shared/script-url';

declare global {
	interface Window {
		_paq?: unknown[];
	}
}

/**
 * Removes an `http://` or `https://` prefix from a URL-like string.
 *
 * @param value - The input string that may include a protocol prefix.
 * @returns The input without a leading HTTP(S) protocol; unchanged when no
 * protocol prefix is present.
 */
function stripProtocol(value: string): string {
	return value.replace(/^https?:\/\//, '');
}

/**
 * Trims trailing slash characters from a string.
 *
 * @param value - The input string to normalize.
 * @returns The input without trailing slashes. For an empty string, returns an
 * empty string.
 */
function stripTrailingSlash(value: string): string {
	return value.replace(/\/+$/, '');
}

/**
 * Resolves the Matomo origin from integration options.
 *
 * @param options - Matomo integration options. `matomoUrl` is used first when
 * present; otherwise `cloudId` is converted to
 * `https://cdn.matomo.cloud/<cloudId>`.
 * @returns A normalized Matomo origin with protocol/trailing slashes removed as
 * needed, or `undefined` when neither `matomoUrl` nor `cloudId` is provided.
 */
function resolveMatomoOrigin(
	options: MatomoAnalyticsOptions
): string | undefined {
	if (options.matomoUrl) {
		return stripTrailingSlash(options.matomoUrl);
	}

	if (options.cloudId) {
		const cleanedCloudId = stripTrailingSlash(stripProtocol(options.cloudId));
		if (cleanedCloudId.endsWith('.matomo.cloud')) {
			return `https://${cleanedCloudId}`;
		}

		return `https://cdn.matomo.cloud/${cleanedCloudId}`;
	}

	return undefined;
}

/**
 * Builds a Matomo `VendorManifest` from helper options.
 *
 * @param options - Manifest toggles:
 * - `enableConsentMode`: enables Matomo consent queue commands and sets
 * `alwaysLoad`/`persistAfterConsentRevoked`.
 * - `consentInitiallyGiven`: when consent mode is enabled, queues
 * `setConsentGiven` during install instead of `requireConsent`.
 * - `enableLinkTracking`: queues `enableLinkTracking` during install.
 * - `disableCookies`: queues `disableCookies` during install.
 * - `trackPageView`: queues `trackPageView` immediately only when consent mode
 * is disabled; when consent mode is enabled, queues it in grant hooks.
 * @returns A Matomo `VendorManifest` with `install`, consent lifecycle hooks,
 * and consent metadata (`alwaysLoad`, `persistAfterConsentRevoked`) derived
 * from `enableConsentMode`.
 */
function createMatomoAnalyticsManifest(options: {
	enableConsentMode: boolean;
	consentInitiallyGiven: boolean;
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

	if (options.enableConsentMode && !options.consentInitiallyGiven) {
		install.push({
			type: 'pushToQueue',
			queue: '_paq',
			value: ['requireConsent'],
		});
	}

	if (options.enableConsentMode && options.consentInitiallyGiven) {
		install.push({
			type: 'pushToQueue',
			queue: '_paq',
			value: ['setConsentGiven'],
		});

		if (options.trackPageView) {
			install.push({
				type: 'pushToQueue',
				queue: '_paq',
				value: ['trackPageView'],
			});
		}
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
	if (options.enableConsentMode && !options.consentInitiallyGiven) {
		onBeforeLoadGranted.push({
			type: 'pushToQueue',
			queue: '_paq',
			value: ['setConsentGiven'],
		});
	}
	if (
		options.trackPageView &&
		options.enableConsentMode &&
		!options.consentInitiallyGiven
	) {
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
	consentInitiallyGiven: false,
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
	/** Default Matomo consent state (`required` blocks, `given` starts enabled). */
	defaultConsent?: 'required' | 'given';
}

/**
 * Creates a Matomo Analytics script.
 *
 * @param options - The options for the Matomo Analytics script.
 * @returns The Matomo Analytics script configuration.
 * @throws {Error} Throws
 * `'matomoAnalytics requires \`matomoUrl\`, \`cloudId\`, or explicit \`trackerUrl\` and \`scriptUrl\` values.'`
 * when either resolved `trackerUrl` or `scriptUrl` is missing (for example,
 * when neither `matomoUrl` nor `cloudId` is provided and explicit
 * `trackerUrl`/`scriptUrl` values are not supplied). Provide `matomoUrl`, or
 * provide both explicit `trackerUrl` and `scriptUrl`.
 */
export function matomoAnalytics(options: MatomoAnalyticsOptions = {}): Script {
	const origin = resolveMatomoOrigin(options);
	let trackerUrl = options.trackerUrl;
	if (!trackerUrl && origin) {
		trackerUrl = joinUrlPath(origin, 'matomo.php');
	}

	let scriptUrl = options.scriptUrl;
	if (!scriptUrl && origin) {
		scriptUrl = joinUrlPath(origin, 'matomo.js');
	}

	if (!trackerUrl || !scriptUrl) {
		throw new Error(
			'matomoAnalytics requires `matomoUrl`, `cloudId`, or explicit `trackerUrl` and `scriptUrl` values.'
		);
	}

	const enableConsentMode =
		options.defaultConsent === 'required' || options.defaultConsent === 'given';
	const consentInitiallyGiven = options.defaultConsent === 'given';

	const manifest = createMatomoAnalyticsManifest({
		enableConsentMode,
		consentInitiallyGiven,
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
