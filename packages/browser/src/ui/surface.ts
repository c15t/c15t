import type { ConsentSnapshot, LegalLinks } from '@c15t/core';
import type { LegalLinksTranslations } from '@c15t/translations';

import { classes } from '../generated/styles';
import type { ConsentClient } from '../types';
import { h } from './dom';

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
 * @param params - Which links, their config and labels.
 * @returns The link elements, possibly empty.
 */
export const renderLegalLinks = function renderLegalLinks(
	params: LegalLinksParams
): HTMLElement[] {
	const { keys, legalLinks, noStyle } = params;
	if (!(keys && legalLinks)) {
		return [];
	}
	const links: HTMLElement[] = [];
	for (const key of keys) {
		const link = legalLinks[key];
		if (!link?.href) {
			continue;
		}
		const target = link.target ?? '_blank';
		links.push(
			h(
				'a',
				{
					class: noStyle ? '' : classes.legalLinks.legalLink,
					'data-testid': `${params.testIdPrefix}-${key}`,
					href: link.href,
					rel: link.rel ?? (target === '_blank' ? 'noreferrer' : undefined),
					target,
				},
				link.label ?? params.labels[key] ?? key
			)
		);
	}
	return links;
};
