/**
 * What the "Secured by" tag shows, shared by `branding.astro` and the
 * browser-rendered banner so both produce the same markup.
 */

import type { ConsentSnapshot } from '@c15t/core';

import type { ClassNameMap } from './class-names';
import { joinClasses } from './prompt-model';

/** Which surface the tag belongs to. */
export type BrandingVariant = 'footer' | 'dialog-tag' | 'banner-tag';

/** Input for {@link resolveBrandingModel}. */
export interface BrandingModelInput {
	/** Render nothing. */
	hide?: boolean;
	/** Ship the DOM without the bundled stylesheet's class names. */
	noStyle?: boolean;
	/** Which surface the tag belongs to. */
	variant?: BrandingVariant;
	/** The brand the snapshot resolved. */
	branding: ConsentSnapshot['branding'];
	/** The host to attribute the referral to. */
	hostname?: string;
	/** The branding stylesheet's class names. */
	styles: ClassNameMap;
}

/** Everything the tag markup needs. */
export interface BrandingModel {
	show: boolean;
	brand: 'c15t' | 'inth';
	href: string;
	variant: BrandingVariant;
	classes: {
		root: string;
		content: string;
		copy: string;
		text: string;
		wordmark: string;
		mark: string;
		label: string;
	};
}

const resolveBrand = function resolveBrand(
	value: ConsentSnapshot['branding'] | 'none'
): 'c15t' | 'inth' | 'none' {
	// Not in the snapshot's type, but a backend can send it to drop the tag.
	if (value === 'none') {
		return 'none';
	}
	if (value === 'inth' || value === 'consent') {
		return 'inth';
	}
	return 'c15t';
};

/**
 * Resolve the tag's brand, link and class names.
 *
 * @param input - The snapshot's brand and the surface's options.
 * @returns The tag model. `show` is `false` when nothing should render.
 */
export const resolveBrandingModel = function resolveBrandingModel(
	input: BrandingModelInput
): BrandingModel {
	const {
		hide = false,
		noStyle = false,
		styles,
		variant = 'banner-tag',
	} = input;
	const resolved = resolveBrand(input.branding);
	const brand = resolved === 'inth' ? 'inth' : 'c15t';
	const refParam = input.hostname ? `?ref=${input.hostname}` : '';
	const cls = (value: string | undefined): string =>
		noStyle ? '' : (value ?? '');
	return {
		brand,
		classes: {
			content: cls(styles.brandingContent),
			copy: cls(styles.brandingCopy),
			label: cls(styles.brandingWordmarkLabel),
			mark: cls(styles.brandingC15TMark),
			root: noStyle
				? ''
				: joinClasses(
						styles.branding,
						variant === 'footer' ? undefined : styles.brandingTag,
						variant === 'dialog-tag' ? styles.brandingTagDialog : undefined,
						variant === 'banner-tag' ? styles.brandingTagBanner : undefined
					),
			text: cls(styles.brandingText),
			wordmark: noStyle
				? ''
				: joinClasses(
						styles.brandingWordmark,
						brand === 'inth' ? styles.brandingInth : styles.brandingC15T
					),
		},
		href:
			brand === 'inth'
				? `https://inth.com${refParam}`
				: `https://c15t.com${refParam}`,
		show: !hide && resolved !== 'none',
		variant,
	};
};

/** The INTH logo. Static markup, safe to inline. */
export const INTH_LOGO_SVG =
	'<svg aria-hidden="true" aria-labelledby="inth-logo" fill="none" viewBox="0 0 88 90" xmlns="http://www.w3.org/2000/svg"><title id="inth-logo">INTH</title><path d="M40.9164 0V8.26444H27.6933V26.7966H40.9164V35.0608H6.15594V26.7966H19.3788V8.26444H6.15594V0H40.9164Z" fill="currentColor"></path><path d="M72.1149 20.1264V0H80.0343V35.0608H74.2747L54.9798 14.8193V35.0608H47.0604V0H52.964L72.1149 20.1264Z" fill="currentColor"></path><path clip-rule="evenodd" d="M71.36 41.6H88V89.6H0V41.6H61.12V31.04L71.36 41.6ZM6.15594 48.0891V56.4034H19.1784V83.2H27.4428V56.4034H40.5656V48.0891H6.15594ZM47.0603 48.1391V83.2H55.3247V70.2441H71.7531V83.2H80.0675V48.1391H71.7531V61.9797H55.3247V48.1391H47.0603Z" fill="currentColor" fill-rule="evenodd"></path></svg>';

/** The c15t mark. Static markup, safe to inline. */
export const C15T_MARK_SVG =
	'<svg aria-hidden="true" aria-labelledby="c15t-icon" viewBox="0 0 446 445" xmlns="http://www.w3.org/2000/svg"><title id="c15t-icon">c15t</title><path d="M223.178.313c39.064 0 70.732 31.668 70.732 70.732-.001 39.064-31.668 70.731-70.732 70.731-12.181 0-23.642-3.079-33.649-8.502l-55.689 55.689a70.267 70.267 0 0 1 5.574 13.441h167.531c8.695-29.217 35.762-50.523 67.804-50.523 39.064 0 70.731 31.668 70.731 70.732s-31.668 70.732-70.731 70.732c-32.042 0-59.108-21.306-67.803-50.523H139.413a70.417 70.417 0 0 1-7.888 17.396l54.046 54.046c10.893-6.851 23.786-10.815 37.605-10.815 39.064 0 70.732 31.669 70.732 70.733 0 39.064-31.668 70.731-70.732 70.731s-70.732-31.667-70.732-70.731c0-10.518 2.296-20.499 6.414-29.471l-57.78-57.78c-8.972 4.117-18.952 6.414-29.47 6.414-39.063 0-70.731-31.668-70.732-70.732 0-39.064 31.669-70.732 70.733-70.732 12.18 0 23.642 3.079 33.649 8.502l55.688-55.688c-5.423-10.007-8.502-21.469-8.502-33.65 0-39.064 31.668-70.733 70.732-70.733Zm0 343.555c-16.742 0-30.314 13.572-30.314 30.314 0 16.741 13.572 30.313 30.314 30.313s30.314-13.572 30.314-30.313c0-16.742-13.572-30.314-30.314-30.314ZM71.611 192.299c-16.742 0-30.315 13.572-30.315 30.314s13.573 30.314 30.315 30.314c16.741 0 30.313-13.572 30.313-30.314 0-16.741-13.572-30.314-30.313-30.314Zm303.138 0c-16.729 0-30.294 13.551-30.315 30.275l.001.039-.001.038c.021 16.725 13.586 30.276 30.315 30.276 16.741 0 30.313-13.572 30.313-30.314 0-16.741-13.572-30.314-30.313-30.314ZM223.178 40.73c-16.742 0-30.314 13.573-30.314 30.315s13.573 30.313 30.314 30.313c16.742 0 30.313-13.572 30.314-30.313 0-16.742-13.572-30.314-30.314-30.315Z" fill="currentColor"></path></svg>';
