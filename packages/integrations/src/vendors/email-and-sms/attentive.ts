import type { Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { readId, skipMissingId, skipScript } from '../_shared/required-id';
import { createScriptReuse } from '../_shared/reuse-script';
import { resolveScriptUrl } from '../_shared/script-url';

/** Attentive's tag, loaded only after marketing consent. */
export const attentiveTagManifest = {
	...vendorManifestContract,
	category: 'marketing',
	install: [{ async: true, src: '{{scriptUrl}}', type: 'loadScript' }],
	persistAfterConsentRevoked: true,
	vendor: 'attentive',
	vendorDetails: {
		homepageUrl: 'https://www.attentive.com/',
		legalName: 'Attentive Mobile Inc.',
		name: 'Attentive',
		privacyPolicyUrl: 'https://www.attentive.com/legal/privacy',
	},
} as const satisfies VendorManifest;

export interface AttentiveTagOptions {
	/** Site slug supplied by Attentive, without the domain or /dtag.js suffix. */
	siteSlug: string;
	/** Consent condition required before loading. @default 'marketing' */
	category?: Script['category'];
	/** Exact tag URL supplied by Attentive or a proxy. */
	scriptUrl?: string;
}

const reuseAttentiveTag = createScriptReuse<AttentiveTagOptions>();

const createAttentiveTag = function createAttentiveTag(
	options: AttentiveTagOptions
): Script {
	const category = options?.category ?? 'marketing';
	const skipped = { category, manifest: attentiveTagManifest };
	const siteSlug = readId(options?.siteSlug);
	if (!siteSlug) {
		return skipMissingId('attentiveTag', 'siteSlug', skipped);
	}
	if (!/^[\w-]+$/u.test(siteSlug)) {
		return skipScript(
			'attentiveTag: invalid siteSlug, use the single site slug from Attentive',
			skipped
		);
	}
	return {
		...resolveManifest(attentiveTagManifest, {
			scriptUrl: resolveScriptUrl(
				options.scriptUrl,
				`https://cdn.attn.tv/${encodeURIComponent(siteSlug)}/dtag.js`
			),
		}),
		category,
		target: 'body',
	};
};

/**
 * Loads Attentive's tag at the end of body after consent.
 * Keep reloadOnConsentRevoked enabled. Removing the tag does not stop the SDK.
 * The first permitted tag stays on this page to avoid duplicate installation.
 * Withdrawal reloads into a page where the stored denial blocks the whole tag.
 * @param options - Attentive site slug and optional loader override.
 * @returns A gated script, or an inactive script for a missing or invalid slug.
 * @example attentiveTag({ siteSlug: 'YOUR_SITE' });
 * @see https://help.attentive.com/hc/en-us/articles/10905920909460-The-Attentive-tag
 */
export const attentiveTag = function attentiveTag(
	options: AttentiveTagOptions
): Script {
	if (!readId(options?.siteSlug)) {
		return skipMissingId('attentiveTag', 'siteSlug', {
			category: options?.category ?? 'marketing',
			manifest: attentiveTagManifest,
		});
	}
	const slug = readId(options.siteSlug);
	if (slug && !/^[\w-]+$/u.test(slug)) {
		return skipScript(
			'attentiveTag: invalid siteSlug, use the single site slug from Attentive',
			{
				category: options.category ?? 'marketing',
				manifest: attentiveTagManifest,
			}
		);
	}
	return reuseAttentiveTag(options, createAttentiveTag);
};
