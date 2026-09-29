import type { Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { joinUrlPath, stripTrailingSlashes } from '../_shared/script-url';

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
const stripProtocol = function stripProtocol(value: string): string {
	if (value.startsWith('https://')) {
		return value.slice('https://'.length);
	}

	if (value.startsWith('http://')) {
		return value.slice('http://'.length);
	}

	return value;
};

/**
 * Resolves the Matomo origin from integration options.
 *
 * @param options - Matomo integration options. `matomoUrl` is used first when
 * present; otherwise `cloudId` is converted to
 * `https://cdn.matomo.cloud/<cloudId>`.
 * @returns A normalized Matomo origin with protocol/trailing slashes removed as
 * needed, or `undefined` when neither `matomoUrl` nor `cloudId` is provided.
 */
const resolveMatomoOrigin = function resolveMatomoOrigin(
	options: MatomoAnalyticsOptions
): string | undefined {
	if (options.matomoUrl) {
		return stripTrailingSlashes(options.matomoUrl);
	}

	if (options.cloudId) {
		const cleanedCloudId = stripTrailingSlashes(stripProtocol(options.cloudId));
		if (cleanedCloudId.endsWith('.matomo.cloud')) {
			return `https://${cleanedCloudId}`;
		}

		return `https://cdn.matomo.cloud/${cleanedCloudId}`;
	}

	return undefined;
};

interface MatomoManifestOptions {
	enableConsentMode: boolean;
	consentInitiallyGiven: boolean;
	enableLinkTracking: boolean;
	disableCookies: boolean;
	trackPageView: boolean;
}

interface MatomoGrantedHooks {
	onBeforeLoadGranted: VendorManifest['onBeforeLoadGranted'];
	onConsentGranted: VendorManifest['onConsentGranted'];
}

const buildInstallSteps = function buildInstallSteps(
	options: MatomoManifestOptions
): VendorManifest['install'] {
	const install: VendorManifest['install'] = [
		{
			ifUndefined: true,
			name: '_paq',
			type: 'setGlobal',
			value: [],
		},
		{
			queue: '_paq',
			type: 'pushToQueue',
			value: ['setTrackerUrl', '{{trackerUrl}}'],
		},
		{
			queue: '_paq',
			type: 'pushToQueue',
			value: ['setSiteId', '{{siteId}}'],
		},
	];

	if (options.enableLinkTracking) {
		install.push({
			queue: '_paq',
			type: 'pushToQueue',
			value: ['enableLinkTracking'],
		});
	}

	if (options.disableCookies) {
		install.push({
			queue: '_paq',
			type: 'pushToQueue',
			value: ['disableCookies'],
		});
	}

	if (options.enableConsentMode && !options.consentInitiallyGiven) {
		install.push({
			queue: '_paq',
			type: 'pushToQueue',
			value: ['requireConsent'],
		});
	}

	if (options.enableConsentMode && options.consentInitiallyGiven) {
		install.push({
			queue: '_paq',
			type: 'pushToQueue',
			value: ['setConsentGiven'],
		});

		if (options.trackPageView) {
			install.push({
				queue: '_paq',
				type: 'pushToQueue',
				value: ['trackPageView'],
			});
		}
	}

	if (options.trackPageView && !options.enableConsentMode) {
		install.push({
			queue: '_paq',
			type: 'pushToQueue',
			value: ['trackPageView'],
		});
	}

	install.push({
		async: true,
		src: '{{scriptUrl}}',
		type: 'loadScript',
	});

	return install;
};

const buildGrantedHooks = function buildGrantedHooks(
	options: MatomoManifestOptions
): MatomoGrantedHooks {
	const onBeforeLoadGranted: VendorManifest['onBeforeLoadGranted'] = [];
	if (options.enableConsentMode && !options.consentInitiallyGiven) {
		onBeforeLoadGranted.push({
			queue: '_paq',
			type: 'pushToQueue',
			value: ['setConsentGiven'],
		});
	}
	if (
		options.trackPageView &&
		options.enableConsentMode &&
		!options.consentInitiallyGiven
	) {
		onBeforeLoadGranted.push({
			queue: '_paq',
			type: 'pushToQueue',
			value: ['trackPageView'],
		});
	}

	const onConsentGranted: VendorManifest['onConsentGranted'] = [];
	if (options.enableConsentMode) {
		onConsentGranted.push({
			queue: '_paq',
			type: 'pushToQueue',
			value: ['setConsentGiven'],
		});

		if (options.trackPageView) {
			onConsentGranted.push({
				queue: '_paq',
				type: 'pushToQueue',
				value: ['trackPageView'],
			});
		}
	}

	return {
		onBeforeLoadGranted,
		onConsentGranted,
	};
};

const buildDeniedHooks = function buildDeniedHooks(
	options: MatomoManifestOptions
): VendorManifest['onConsentDenied'] {
	const onConsentDenied: VendorManifest['onConsentDenied'] = [];
	if (options.enableConsentMode) {
		onConsentDenied.push({
			queue: '_paq',
			type: 'pushToQueue',
			value: ['forgetConsentGiven'],
		});
	}

	return onConsentDenied;
};

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
const createMatomoAnalyticsManifest = function createMatomoAnalyticsManifest(
	options: MatomoManifestOptions
): VendorManifest {
	const { onBeforeLoadGranted, onConsentGranted } = buildGrantedHooks(options);
	let alwaysLoad: true | undefined;
	let persistAfterConsentRevoked: true | undefined;
	if (options.enableConsentMode) {
		alwaysLoad = true;
		persistAfterConsentRevoked = true;
	}

	return {
		...vendorManifestContract,
		alwaysLoad,
		category: 'measurement',
		install: buildInstallSteps(options),
		onBeforeLoadGranted,
		onConsentDenied: buildDeniedHooks(options),
		onConsentGranted,
		persistAfterConsentRevoked,
		vendor: 'matomo-analytics',
	};
};

export const matomoAnalyticsManifest = createMatomoAnalyticsManifest({
	consentInitiallyGiven: false,
	disableCookies: false,
	enableConsentMode: false,
	enableLinkTracking: false,
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
export const matomoAnalytics = function matomoAnalytics(
	options: MatomoAnalyticsOptions = {}
): Script {
	const origin = resolveMatomoOrigin(options);
	let { trackerUrl } = options;
	if (!trackerUrl && origin) {
		trackerUrl = joinUrlPath(origin, 'matomo.php');
	}

	let { scriptUrl } = options;
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
		consentInitiallyGiven,
		disableCookies: options.disableCookies ?? false,
		enableConsentMode,
		enableLinkTracking: options.enableLinkTracking ?? false,
		trackPageView: options.trackPageView ?? true,
	});

	return resolveManifest(manifest, {
		scriptUrl,
		siteId: String(options.siteId ?? 1),
		trackerUrl,
	});
};
