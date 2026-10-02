import type { Script } from 'c15t';
import { resolveManifest } from '../../resolve';
import { type VendorManifest, vendorManifestContract } from '../../types';

declare global {
	interface Window {
		// Populated by the loaded tracker (`window.statable ||= { t() {} }`).
		// We intentionally do NOT pre-create this global: the real tracker only
		// initializes when it is absent/undefined. See its JS API docs — early
		// events are neither queued nor replayed.
		statable?: {
			t?: (eventName: string, props?: Record<string, unknown>) => void;
		};
	}
}

/**
 * Statable Analytics vendor manifest.
 *
 * Statable is a cookieless, EU-based analytics tool. The site ID is embedded
 * directly in the script path (`/js/{siteId}/s.js`) and mirrored into the
 * `data-id` attribute. The script is gated on `measurement` consent and
 * unloaded when consent is revoked.
 *
 * There is no bootstrap stub on purpose. The live tracker initializes with
 * `window.statable ||= {…}` and its documented JS API does not queue or
 * replay early calls; a pre-existing truthy `window.statable` would make the
 * tracker skip initialization entirely, silently dropping outbound-link,
 * download, and custom events.
 */
export const statableAnalyticsManifest = {
	...vendorManifestContract,
	vendor: 'statable-analytics',
	category: 'measurement',
	bootstrap: [],
	install: [
		{
			type: 'loadScript',
			src: '{{scriptUrl}}',
			defer: true,
			attributes: {
				'data-id': '{{siteId}}',
			},
		},
	],
} as const satisfies VendorManifest;

export interface StatableAnalyticsOptions {
	/**
	 * Numeric site ID from the Statable dashboard.
	 */
	siteId: string | number;

	/**
	 * Custom loader URL. The `{siteId}` placeholder is replaced with the
	 * resolved site ID.
	 * @default 'https://statable.com/js/{siteId}/s.js'
	 */
	scriptUrl?: string;

	/**
	 * Explicit event ingestion endpoint. The tracker otherwise derives it from
	 * the script host (`new URL(currentScript.src).origin + '/api/event'`), so a
	 * custom `scriptUrl` on a CDN would otherwise send events to that CDN and
	 * lose them. Mapped to the script's `data-tracking-api` attribute.
	 */
	trackingApi?: string;
}

/**
 * Normalizes and validates the site id.
 *
 * Numeric judgment rather than a regex: every finite numeric form is accepted
 * (0, negatives, decimals, scientific notation) while strings that do not
 * represent a number after trimming are rejected before the manifest is
 * constructed.
 *
 * @param input - Raw site id from options.
 * @returns The normalized site id.
 * @throws {Error} `statableAnalytics: missing siteId` for absent/blank input;
 * `statableAnalytics: invalid siteId` for non-numeric or non-finite values.
 */
function resolveSiteId(input: string | number): string {
	if (typeof input === 'number') {
		if (!Number.isFinite(input)) {
			throw new Error('statableAnalytics: invalid siteId');
		}
		return String(input);
	}

	if (typeof input === 'string') {
		const trimmed = input.trim();
		if (trimmed.length === 0) {
			throw new Error('statableAnalytics: missing siteId');
		}
		if (!Number.isFinite(Number(trimmed))) {
			throw new Error('statableAnalytics: invalid siteId');
		}
		return trimmed;
	}

	throw new Error('statableAnalytics: missing siteId');
}

/**
 * Creates a Statable Analytics script.
 *
 * @see https://statable.com/docs/
 *
 * @param options - The options for the Statable Analytics script.
 * @returns The Statable Analytics script.
 * @throws {Error} Throws `statableAnalytics: missing siteId` when
 * `options.siteId` is missing or blank, or `statableAnalytics: invalid siteId`
 * when it is not a finite numeric value.
 *
 * @example
 * ```ts
 * import { statableAnalytics } from '@c15t/scripts/statable-analytics';
 *
 * statableAnalytics({ siteId: '12345' });
 * ```
 */
export function statableAnalytics(options: StatableAnalyticsOptions): Script {
	const siteId = resolveSiteId(options.siteId);

	const defaultUrl = `https://statable.com/js/${siteId}/s.js`;
	const scriptUrl = options.scriptUrl
		? options.scriptUrl.replaceAll('{siteId}', siteId)
		: defaultUrl;

	const resolved = resolveManifest(statableAnalyticsManifest, {
		scriptUrl,
		siteId,
	});

	// Pin the ingestion endpoint independently of the script host: without it
	// the tracker targets `<script origin>/api/event`, which a CDN loader does
	// not serve. Added only when provided so the default snippet stays clean.
	if (typeof options.trackingApi === 'string' && options.trackingApi.trim()) {
		resolved.attributes = {
			...resolved.attributes,
			'data-tracking-api': options.trackingApi.trim(),
		};
	}

	return resolved;
}
