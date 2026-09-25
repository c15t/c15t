/**
 * DOM helpers shared by the browser-rendered banners.
 */

import type { ConsentSnapshot } from '@c15t/core';

import {
	C15T_MARK_SVG,
	INTH_LOGO_SVG,
	resolveBrandingModel,
} from '../banner/branding-model';
import type { ClassNameMap } from '../banner/class-names';

type Attributes = Record<string, string | undefined>;

/**
 * Create an element, skipping undefined attributes.
 *
 * @param tag - The tag name.
 * @param attributes - Attributes to set.
 * @param children - Child nodes or text.
 * @returns The element.
 */
export const element = function element(
	tag: string,
	attributes: Attributes,
	children: (Node | string)[] = []
): HTMLElement {
	const node = document.createElement(tag);
	for (const [name, value] of Object.entries(attributes)) {
		if (value !== undefined) {
			node.setAttribute(name, value);
		}
	}
	node.append(...children);
	return node;
};

/**
 * Read the JSON a banner component left in its spot.
 *
 * @param spot - The placeholder element.
 * @param attribute - The attribute carrying the JSON.
 * @returns The parsed value, or `null` when it is missing or malformed.
 */
export const readSpot = function readSpot(
	spot: HTMLElement,
	attribute: string
): Record<string, unknown> | null {
	try {
		const parsed: unknown = JSON.parse(spot.getAttribute(attribute) ?? '');
		return parsed && typeof parsed === 'object'
			? (parsed as Record<string, unknown>)
			: null;
	} catch {
		return null;
	}
};

/** Input for {@link renderBrandingTag}. */
export interface BrandingTagInput {
	snapshot: ConsentSnapshot;
	hide?: boolean;
	noStyle?: boolean;
	styles: ClassNameMap;
	securedBy: string;
	testId: string;
}

/**
 * Build the "Secured by" tag `branding.astro` renders.
 *
 * @param input - The snapshot, the banner's options and its test id.
 * @returns The tag, or `null` when branding is hidden.
 */
export const renderBrandingTag = function renderBrandingTag(
	input: BrandingTagInput
): HTMLElement | null {
	const branding = resolveBrandingModel({
		branding: input.snapshot.branding,
		hide: input.hide,
		hostname: window.location.hostname,
		noStyle: input.noStyle,
		styles: input.styles,
		variant: 'banner-tag',
	});
	if (!branding.show) {
		return null;
	}
	const { classes } = branding;
	let wordmark: HTMLElement;
	if (branding.brand === 'inth') {
		wordmark = element('span', { class: classes.wordmark, dir: 'ltr' });
		wordmark.innerHTML = INTH_LOGO_SVG;
	} else {
		const mark = element('span', { class: classes.mark });
		mark.innerHTML = C15T_MARK_SVG;
		wordmark = element('span', { class: classes.wordmark, dir: 'ltr' }, [
			mark,
			element('span', { class: classes.label }, ['c15t']),
		]);
	}
	return element(
		'a',
		{
			class: classes.root,
			'data-branding': branding.brand,
			'data-testid': input.testId,
			'data-variant': branding.variant,
			href: branding.href,
		},
		[
			element('span', { class: classes.content, 'data-slot': 'tag-content' }, [
				element('span', { class: classes.copy }, [
					element('span', { class: classes.text }, [input.securedBy]),
				]),
				wordmark,
			]),
		]
	);
};

/**
 * Hide a freshly built banner until `syncBannerVisibility` decides, the
 * same as a prerendered server banner, with its overlay in front of it.
 *
 * @param root - The banner root.
 * @param overlay - The backdrop, for blocking banners.
 * @returns The nodes to insert, in document order.
 */
export const hiddenBanner = function hiddenBanner(
	root: HTMLElement,
	overlay: HTMLElement | null
): HTMLElement[] {
	root.hidden = true;
	root.setAttribute('data-c15t-visible', 'false');
	if (!overlay) {
		return [root];
	}
	overlay.hidden = true;
	return [overlay, root];
};
