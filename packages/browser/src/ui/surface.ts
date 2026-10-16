import type { ConsentSnapshot, LegalLinks } from '@c15t/core';
import type { LegalLinksTranslations } from '@c15t/translations';

import { classes } from '../generated/styles';
import type { ConsentClient } from '../types';
import { h } from './dom';
import type { SlotApplier } from './slots';

/** What every surface renders against. */
export interface SurfaceContext {
	/** The client whose kernel drives the surface. */
	client: ConsentClient;
	/** The `.c15t-theme-root` element surfaces append to. */
	root: HTMLElement;
	/** Ship the DOM without class names. */
	noStyle: boolean;
	/** Skip enter and exit transitions. */
	disableAnimation: boolean;
	/** The site's legal links, if configured. */
	legalLinks: LegalLinks | undefined;
	/** Marks an element as a `theme.slots` part and applies its overrides. */
	slot: SlotApplier;
}

/** A mounted surface. */
export interface Surface {
	/** Reconcile the DOM with a snapshot. */
	sync: (snapshot: ConsentSnapshot) => void;
	/** Remove the surface and release listeners. */
	destroy: () => void;
}

/** What {@link renderLegalLinks} needs. */
export interface LegalLinksParams {
	/** Which links to render; `null` or empty renders none. */
	keys: (keyof LegalLinks)[] | null | undefined;
	/** The configured links. */
	legalLinks: LegalLinks | undefined;
	/** Translated labels, used when a link carries none of its own. */
	labels: Partial<LegalLinksTranslations>;
	/** Prefix for each link's test id. */
	testIdPrefix: string;
	/** Ship the DOM without class names. */
	noStyle: boolean;
}

/**
 * Render the inline legal links a surface shows after its description.
 *
 * Matches the React banner's `InlineLegalLinks`: a space first, then each
 * link, with a comma inside every link but the last and a space after it.
 *
 * @param params - Which links, their config and labels.
 * @returns A wrapper holding the links, or nothing when there are none.
 */
export const renderLegalLinks = function renderLegalLinks(
	params: LegalLinksParams
): HTMLElement[] {
	const { keys, legalLinks, noStyle } = params;
	if (!(keys && legalLinks)) {
		return [];
	}
	const entries = keys.flatMap((key) => {
		const link = legalLinks[key];
		return link?.href ? [{ key, link }] : [];
	});
	if (entries.length === 0) {
		return [];
	}
	const last = entries.length - 1;
	return [
		h(
			'span',
			{},
			' ',
			...entries.map(({ key, link }, index) => {
				const target = link.target ?? '_blank';
				const label = link.label ?? params.labels[key] ?? key;
				return h(
					'span',
					{},
					h(
						'a',
						{
							class: noStyle ? '' : classes.legalLinks.legalLink,
							'data-testid': `${params.testIdPrefix}-${key}`,
							href: link.href,
							rel: link.rel ?? (target === '_blank' ? 'noreferrer' : undefined),
							target,
						},
						index < last ? `${label},` : label
					),
					index < last ? ' ' : null
				);
			})
		),
	];
};
