import type { Script } from 'c15t';
import { resolveManifest } from './resolve';
import { type VendorManifest, vendorManifestContract } from './types';

type IntercomSettings = Record<string, unknown> & {
	app_id: string;
};

declare global {
	interface Window {
		Intercom: ((...args: unknown[]) => void) & {
			q?: unknown[][];
		};
		intercomSettings?: IntercomSettings;
	}
}

/**
 * Intercom vendor manifest.
 *
 * Seeds `window.intercomSettings` and a simple queueing `Intercom` stub before
 * loading the widget bundle.
 */
export const intercomManifest = {
	...vendorManifestContract,
	vendor: 'intercom',
	category: 'functionality',
	install: [
		{
			type: 'defineStubFunction',
			name: 'Intercom',
			queue: {
				property: 'q',
			},
			queueFormat: 'array',
			ifUndefined: true,
		},
		{
			type: 'setGlobal',
			name: 'intercomSettings',
			value: '{{settings}}',
			ifUndefined: false,
		},
		{
			type: 'loadScript',
			src: '{{scriptSrc}}',
			async: true,
		},
	],
} as const satisfies VendorManifest;

export interface IntercomOptions {
	/**
	 * Your Intercom app ID.
	 */
	appId: string;

	/**
	 * Additional serializable Intercom settings merged into `intercomSettings`.
	 */
	settings?: Record<string, unknown>;

	/** Intercom loader URL. */
	scriptSrc?: string;
}

/**
 * Creates an Intercom script.
 *
 * The manifest preserves the declarative settings bootstrap and queue stub,
 * while leaving richer runtime boot/update flows to the loaded Intercom SDK.
 *
 * @param options - The options for the Intercom script
 * @returns The Intercom script configuration
 *
 * @example
 * ```ts
 * const intercomScript = intercom({
 *   appId: 'abc123',
 * });
 * ```
 *
 * @see {@link https://developers.intercom.com/installing-intercom/web/installation} Intercom installation documentation
 */
export function intercom({
	appId,
	settings,
	scriptSrc,
}: IntercomOptions): Script {
	const resolved = resolveManifest(intercomManifest, {
		settings: {
			...(settings ?? {}),
			app_id: appId,
		},
		scriptSrc: scriptSrc ?? `https://widget.intercom.io/widget/${appId}`,
	});

	return resolved;
}
