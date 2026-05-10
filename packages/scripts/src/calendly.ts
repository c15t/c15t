import type { Script } from 'c15t';
import { resolveManifest } from './resolve';
import { type VendorManifest, vendorManifestContract } from './types';

declare global {
	interface Window {
		Calendly?: {
			q?: unknown[][];
			initInlineWidget: (options: Record<string, unknown>) => void;
			initPopupWidget: (options: Record<string, unknown>) => void;
			initBadgeWidget: (options: Record<string, unknown>) => void;
			showPopupWidget: (url: string) => void;
			closePopupWidget: () => void;
			initPopupWidgetWithText: (options: Record<string, unknown>) => void;
		};
	}
}

/**
 * Calendly vendor manifest.
 *
 * A queueable global stub lets callers invoke the common Calendly widget
 * methods before the vendor bundle takes over.
 */
export const calendlyManifest = {
	...vendorManifestContract,
	vendor: 'calendly',
	category: 'functionality',
	bootstrap: [
		{
			type: 'setGlobal',
			name: 'Calendly',
			value: {
				q: [],
			},
			ifUndefined: true,
		},
		{
			type: 'defineQueueMethods',
			target: 'Calendly',
			queue: {
				property: 'q',
			},
			methods: [
				'initInlineWidget',
				'initPopupWidget',
				'initBadgeWidget',
				'showPopupWidget',
				'closePopupWidget',
				'initPopupWidgetWithText',
			],
		},
	],
	install: [
		{
			type: 'loadScript',
			src: '{{scriptSrc}}',
			async: true,
		},
	],
} as const satisfies VendorManifest;

export interface CalendlyOptions {
	/** Full Calendly widget loader URL override. */
	scriptSrc?: string;
}

/**
 * Creates a Calendly script.
 *
 * The helper intentionally omits inline widget auto-initialization because the
 * vendor API requires live DOM elements that c15t manifests cannot serialize.
 *
 * @param options - Optional configuration for the Calendly script
 * @returns The Calendly script configuration
 */
export function calendly(options: CalendlyOptions = {}): Script {
	let resolvedScriptSrc = options.scriptSrc;

	if (!resolvedScriptSrc) {
		resolvedScriptSrc = 'https://assets.calendly.com/assets/external/widget.js';
	}

	const resolved = resolveManifest(calendlyManifest, {
		scriptSrc: resolvedScriptSrc,
	});

	return resolved;
}
