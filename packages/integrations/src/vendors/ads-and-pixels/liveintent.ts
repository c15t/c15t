import type { Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { ManifestStep, VendorManifest } from '../../types';
import { readId, skipMissingId } from '../_shared/required-id';
import { resolveScriptUrl, trimToUndefined } from '../_shared/script-url';

/** LiveConnect's plain object event queue. */
export interface LiveIntentEvent extends Record<string, unknown> {
	/** Event type from the account's event tag, for example conversion. */
	event: string;
}

declare global {
	interface Window {
		liQ?: { push: (event: LiveIntentEvent) => unknown };
		LI?: { appId?: string };
	}
}

/** LiveIntent LiveConnect loader, gated on marketing consent. */
export const liveIntentTagManifest = {
	...vendorManifestContract,
	bootstrap: [{ name: 'liQ', type: 'setGlobal', value: [] }],
	category: 'marketing',
	install: [
		{
			async: true,
			attributes: { charset: 'utf-8' },
			src: '{{scriptUrl}}',
			type: 'loadScript',
		},
	],
	persistAfterConsentRevoked: true,
	vendor: 'liveintent',
	vendorDetails: {
		homepageUrl: 'https://www.liveintent.com/',
		legalName: 'LiveIntent, Inc.',
		name: 'LiveIntent',
		privacyPolicyUrl: 'https://www.liveintent.com/privacy-policy/',
	},
} as const satisfies VendorManifest;

/** Account-specific LiveConnect tag and optional initial event objects. */
export interface LiveIntentTagOptions {
	/** Filename without .min.js, supplied by LiveIntent, for example a-1234. */
	tagId: string;
	/**
	 * Optional events queued once on the initial grant. Strings remain literal,
	 * including `{{...}}`. Do not include sensitive data without permission.
	 */
	events?: readonly LiveIntentEvent[];
	/** Override the account tag URL. A blank value uses the default URL. */
	scriptUrl?: string;
}

/**
 * Loads LiveConnect only after marketing consent.
 * @param options - Public tag ID, optional initial events and loader URL.
 * @returns A gated script, or a skipped script for a missing tag ID.
 * @remarks Keep reload on revocation enabled. LiveConnect has no documented stop API.
 * Applicable TCF and GPP requirements remain additional to this loader gate.
 * @example liveIntentTag({ tagId: 'YOUR_TAG_ID' });
 * @see https://support.liveintent.com/liveconnect-implementation-guide/
 */
export const liveIntentTag = function liveIntentTag(
	options: LiveIntentTagOptions
): Script {
	const tagId = readId(options?.tagId);
	if (tagId === undefined) {
		return skipMissingId('liveIntentTag', 'tagId', {
			category: 'marketing',
			manifest: liveIntentTagManifest,
		});
	}
	const config: Record<string, unknown> = {
		scriptUrl: resolveScriptUrl(
			trimToUndefined(options.scriptUrl),
			`https://b-code.liadm.com/${encodeURIComponent(tagId)}.min.js`
		),
	};
	const events: ManifestStep[] = (options.events ?? []).map((event, index) => {
		const key = `event${index}`;
		config[key] = event;
		return {
			args: [`{{${key}}}`],
			global: 'liQ',
			method: 'push',
			type: 'callGlobal',
		};
	});
	return resolveManifest(
		{
			...liveIntentTagManifest,
			install: [...events, ...liveIntentTagManifest.install],
		},
		config
	);
};
