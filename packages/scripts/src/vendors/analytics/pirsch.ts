import type { Script } from '@c15t/core';
import { resolveManifest } from '../../resolve';
import { type VendorManifest, vendorManifestContract } from '../../types';
import { resolveScriptUrl, trimToUndefined } from '../_shared/script-url';

declare global {
	interface Window {
		pirsch?: (
			eventName: string,
			options?: {
				duration?: number;
				meta?: Record<string, unknown>;
				non_interactive?: boolean;
			}
		) => Promise<null | undefined>;
		pirschClearSession?: () => void;
		pirschInit?: () => void;
		pirschNotFound?: () => void;
	}
}

const DEFAULT_PIRSCH_SCRIPT_URL = 'https://api.pirsch.io/pa.js';
const DEFAULT_PIRSCH_EXTENDED_SCRIPT_URL =
	'https://api.pirsch.io/pirsch-extended.js';

/**
 * Pirsch vendor manifest.
 *
 * Configures Pirsch through script attributes. Pirsch finds the script element
 * by a fixed element id, so the `id` attribute is part of the loader contract.
 */
export const pirschManifest = {
	...vendorManifestContract,
	vendor: 'pirsch',
	category: 'measurement',
	install: [
		{
			type: 'loadScript',
			src: '{{scriptUrl}}',
			defer: true,
			attributes: {
				id: '{{scriptElementId}}',
				'data-code': '{{identificationCode}}',
				'data-domain': '{{domain}}',
				'data-dev': '{{dev}}',
				'data-hit-endpoint': '{{hitEndpoint}}',
				'data-event-endpoint': '{{eventEndpoint}}',
				'data-disable-page-views': '{{disablePageViews}}',
			},
		},
	],
} as const satisfies VendorManifest;

export interface PirschOptions {
	/**
	 * Your Pirsch identification code.
	 */
	identificationCode: string;

	/**
	 * Additional dashboard domains, optionally including per-domain codes.
	 *
	 * Arrays are serialized as Pirsch's comma-separated `data-domain` value.
	 */
	domain?: string | string[];

	/**
	 * Enable localhost testing by rewriting the tracked hostname.
	 */
	dev?: string;

	/**
	 * Custom pageview endpoint.
	 */
	hitEndpoint?: string;

	/**
	 * Custom event endpoint.
	 */
	eventEndpoint?: string;

	/**
	 * Disable automatic pageview tracking.
	 */
	disablePageViews?: boolean;

	/**
	 * Load Pirsch's extended script variant.
	 */
	extended?: boolean;

	/**
	 * Custom loader URL.
	 */
	scriptUrl?: string;
}

function commaListDataAttribute(
	value: string | string[] | undefined
): string | undefined {
	if (value === undefined) {
		return undefined;
	}

	if (Array.isArray(value)) {
		const items = value
			.map((item) => item.trim())
			.filter((item) => item.length > 0);

		if (items.length === 0) {
			return undefined;
		}

		return items.join(',');
	}

	return trimToUndefined(value);
}

function presenceDataAttribute(value: boolean | undefined): string | undefined {
	if (value === true) {
		return '';
	}

	return undefined;
}

function getPirschScriptElementId(options: PirschOptions): string {
	if (options.extended === true) {
		return 'pirschextendedjs';
	}

	return 'pianjs';
}

function getPirschScriptUrl(options: PirschOptions): string {
	const defaultScriptUrl =
		options.extended === true
			? DEFAULT_PIRSCH_EXTENDED_SCRIPT_URL
			: DEFAULT_PIRSCH_SCRIPT_URL;

	return resolveScriptUrl(trimToUndefined(options.scriptUrl), defaultScriptUrl);
}

/**
 * Creates a Pirsch Analytics script.
 *
 * @see https://docs.pirsch.io/get-started/frontend-integration
 *
 * @param options - The options for the Pirsch script.
 * @returns The Pirsch script.
 * @throws {Error} When `identificationCode` is missing, empty, or invalid.
 * Provide a valid non-empty `identificationCode` string to prevent this error.
 *
 * @example
 * ```ts
 * import { pirsch } from '@c15t/scripts/pirsch';
 *
 * pirsch({
 *   identificationCode: 'YOUR_IDENTIFICATION_CODE',
 *   domain: 'rollup.example.com:ROLLUP_CODE',
 * });
 * ```
 */
export function pirsch(options: PirschOptions): Script {
	const identificationCode = options.identificationCode.trim();
	if (identificationCode.length === 0) {
		throw new Error(
			'pirsch: invalid identificationCode - must be a non-empty string'
		);
	}

	const resolved = resolveManifest(pirschManifest, {
		identificationCode,
		domain: commaListDataAttribute(options.domain),
		dev: trimToUndefined(options.dev),
		hitEndpoint: trimToUndefined(options.hitEndpoint),
		eventEndpoint: trimToUndefined(options.eventEndpoint),
		disablePageViews: presenceDataAttribute(options.disablePageViews),
		scriptElementId: getPirschScriptElementId(options),
		scriptUrl: getPirschScriptUrl(options),
	});

	// pa.js only runs pirschInit() from a DOMContentLoaded listener, but c15t
	// usually injects the script after that event has already fired (consent
	// granted post-load), so custom event bindings would never initialize.
	// Call it ourselves exactly when the native listener can no longer fire.
	const manifestOnLoad = resolved.onLoad;
	resolved.onLoad = (info) => {
		manifestOnLoad?.(info);

		if (document.readyState !== 'loading') {
			window.pirschInit?.();
		}
	};

	return resolved;
}
