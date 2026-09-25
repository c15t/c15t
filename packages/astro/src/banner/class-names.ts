/**
 * The stylesheet class names the banner markup uses.
 *
 * Imported on the server only. The browser-rendered banner receives these
 * through the spot `<ConsentBanner />` leaves for it rather than importing
 * the class maps itself: in the browser those modules also import their
 * stylesheets, and Astro links every stylesheet a page script can reach,
 * so the page would carry a second copy of rules the integration already
 * injects.
 */

import brandingStyles from '@c15t/ui/styles/components/branding';
import buttonStyles from '@c15t/ui/styles/components/button';
import actionStyles from '@c15t/ui/styles/components/consent-actions';
import bannerStyles from '@c15t/ui/styles/components/consent-banner';
import iabBannerStyles from '@c15t/ui/styles/components/iab-consent-banner';

/** Class names for one component, keyed by the stylesheet's own names. */
export type ClassNameMap = Record<string, string | undefined>;

/** The class maps the banner and its branding tag read. */
export interface PromptClassNames {
	banner: ClassNameMap;
	actions: ClassNameMap;
	button: ClassNameMap;
	branding: ClassNameMap;
}

/** The class maps the IAB banner and its branding tag read. */
export interface IABPromptClassNames {
	iabBanner: ClassNameMap;
	actions: ClassNameMap;
	button: ClassNameMap;
	branding: ClassNameMap;
}

const pick = function pick(
	source: Record<string, string>,
	keys: string[]
): ClassNameMap {
	return Object.fromEntries(keys.map((key) => [key, source[key]]));
};

/** The banner's class names, trimmed to the ones its markup uses. */
export const promptClassNames: PromptClassNames = {
	actions: pick(actionStyles, ['actionGroup', 'actionRoot']),
	banner: pick(bannerStyles, [
		'bannerVisible',
		'card',
		'cardShell',
		'description',
		'footer',
		'header',
		'overlay',
		'overlayVisible',
		'rightLink',
		'rights',
		'root',
		'title',
	]),
	branding: pick(brandingStyles, [
		'branding',
		'brandingC15T',
		'brandingC15TMark',
		'brandingContent',
		'brandingCopy',
		'brandingInth',
		'brandingTag',
		'brandingTagBanner',
		'brandingTagDialog',
		'brandingText',
		'brandingWordmark',
		'brandingWordmarkLabel',
	]),
	button: pick(buttonStyles, ['button']),
};

/** The IAB banner's class names, trimmed to the ones its markup uses. */
export const iabPromptClassNames: IABPromptClassNames = {
	actions: promptClassNames.actions,
	branding: promptClassNames.branding,
	button: promptClassNames.button,
	iabBanner: pick(iabBannerStyles, [
		'bannerVisible',
		'card',
		'cardShell',
		'description',
		'footer',
		'header',
		'legitimateInterestNotice',
		'overlay',
		'overlayVisible',
		'partnersLink',
		'purposeList',
		'purposeMore',
		'root',
		'title',
	]),
};
