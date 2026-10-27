import type { Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { readId, skipMissingId } from '../_shared/required-id';
import { resolveScriptUrl } from '../_shared/script-url';

/** Vector's consent-gated pixel loader and nested argument queue. */
export const vectorManifest = {
	...vendorManifestContract,
	category: 'marketing',
	install: [
		{
			ifUndefined: true,
			name: 'vector',
			type: 'setGlobal',
			value: { loaded: true, q: [] },
		},
		{
			methods: ['load', 'identify', 'on'],
			preserveExisting: true,
			queue: { property: 'q' },
			queueFormat: 'nameAndArgs',
			target: 'vector',
			type: 'defineQueueMethods',
		},
		{
			args: ['{{pixelId}}'],
			global: 'vector',
			method: 'load',
			type: 'callGlobal',
		},
		{
			async: true,
			src: '{{scriptUrl}}',
			type: 'loadScript',
		},
	],
	persistAfterConsentRevoked: true,
	vendor: 'vector',
	vendorDetails: {
		homepageUrl: 'https://www.vector.co/',
		legalName: 'GetVector, Inc.',
		name: 'Vector',
		privacyPolicyUrl: 'https://www.vector.co/legal/privacy',
	},
} as const satisfies VendorManifest;

/** Public configuration from Vector's Settings > Pixel page. */
export interface VectorOptions {
	/** Pixel ID passed to vector.load in your account's install snippet. */
	pixelId: string;
	/** Override the SDK URL. Blank values use https://cdn.vector.co/pixel.js. */
	scriptUrl?: string;
}

/**
 * Loads Vector after marketing consent, once per page.
 *
 * @param options - Public pixel ID and optional SDK URL.
 * @returns A consent-gated script, or a skipped script for an invalid ID.
 * @remarks A missing or blank pixelId logs an error and skips loading.
 * Vector has no documented stop API. Keep reload on revocation enabled;
 * without a reload, running or in-flight vendor code can continue.
 * @example vector({ pixelId: 'YOUR_VECTOR_PIXEL_ID' });
 * @see https://learn.vector.co/articles/5402074849-adding-the-pixel-to-your-site
 */
export const vector = function vector(options: VectorOptions): Script {
	const pixelId = readId(options?.pixelId);
	if (pixelId === undefined) {
		return skipMissingId('vector', 'pixelId', {
			category: 'marketing',
			manifest: vectorManifest,
		});
	}

	return resolveManifest(vectorManifest, {
		pixelId,
		scriptUrl: resolveScriptUrl(
			options.scriptUrl,
			'https://cdn.vector.co/pixel.js'
		),
	});
};
