import type { ConsentSnapshot } from '@c15t/core';

import { classes } from '../generated/styles';
import { cx, h, svg } from './dom';

const C15T_MARK =
	'M223.178.313c39.064 0 70.732 31.668 70.732 70.732-.001 39.064-31.668 70.731-70.732 70.731-12.181 0-23.642-3.079-33.649-8.502l-55.689 55.689a70.267 70.267 0 0 1 5.574 13.441h167.531c8.695-29.217 35.762-50.523 67.804-50.523 39.064 0 70.731 31.668 70.731 70.732s-31.668 70.732-70.731 70.732c-32.042 0-59.108-21.306-67.803-50.523H139.413a70.417 70.417 0 0 1-7.888 17.396l54.046 54.046c10.893-6.851 23.786-10.815 37.605-10.815 39.064 0 70.732 31.669 70.732 70.733 0 39.064-31.668 70.731-70.732 70.731s-70.732-31.667-70.732-70.731c0-10.518 2.296-20.499 6.414-29.471l-57.78-57.78c-8.972 4.117-18.952 6.414-29.47 6.414-39.063 0-70.731-31.668-70.732-70.732 0-39.064 31.669-70.732 70.733-70.732 12.18 0 23.642 3.079 33.649 8.502l55.688-55.688c-5.423-10.007-8.502-21.469-8.502-33.65 0-39.064 31.668-70.733 70.732-70.733Zm0 343.555c-16.742 0-30.314 13.572-30.314 30.314 0 16.741 13.572 30.313 30.314 30.313s30.314-13.572 30.314-30.313c0-16.742-13.572-30.314-30.314-30.314ZM71.611 192.299c-16.742 0-30.315 13.572-30.315 30.314s13.573 30.314 30.315 30.314c16.741 0 30.313-13.572 30.313-30.314 0-16.741-13.572-30.314-30.313-30.314Zm303.138 0c-16.729 0-30.294 13.551-30.315 30.275l.001.039-.001.038c.021 16.725 13.586 30.276 30.315 30.276 16.741 0 30.313-13.572 30.313-30.314 0-16.741-13.572-30.314-30.313-30.314ZM223.178 40.73c-16.742 0-30.314 13.573-30.314 30.315s13.573 30.313 30.314 30.313c16.742 0 30.313-13.572 30.314-30.313 0-16.742-13.572-30.314-30.314-30.315Z';

const INTH_MARK = [
	'M40.9164 0V8.26444H27.6933V26.7966H40.9164V35.0608H6.15594V26.7966H19.3788V8.26444H6.15594V0H40.9164Z',
	'M72.1149 20.1264V0H80.0343V35.0608H74.2747L54.9798 14.8193V35.0608H47.0604V0H52.964L72.1149 20.1264Z',
	'M71.36 41.6H88V89.6H0V41.6H61.12V31.04L71.36 41.6ZM6.15594 48.0891V56.4034H19.1784V83.2H27.4428V56.4034H40.5656V48.0891H6.15594ZM47.0603 48.1391V83.2H55.3247V70.2441H71.7531V83.2H80.0675V48.1391H71.7531V61.9797H55.3247V48.1391H47.0603Z',
];

/** Which surface a branding tag belongs to. */
export type BrandingVariant = 'footer' | 'dialog-tag' | 'banner-tag';

/** What {@link renderBranding} needs. */
export interface BrandingParams {
	/** The brand the transport resolved. */
	branding: ConsentSnapshot['branding'];
	/** Which surface the tag belongs to. */
	variant: BrandingVariant;
	/** "Secured by", already translated. */
	securedBy: string;
	/** Drop the tag. */
	hide: boolean;
	/** Ship the DOM without class names. */
	noStyle: boolean;
	/** Test id, so each surface keeps its own. */
	testId: string;
}

const resolveBranding = function resolveBranding(
	value: ConsentSnapshot['branding']
): 'c15t' | 'inth' {
	return value === 'inth' || value === 'consent' ? 'inth' : 'c15t';
};

/**
 * The brand's compact mark, as on the React and Vue triggers: the c15t
 * node graph, or the inth monogram for `inth` and `consent` branding.
 *
 * @param value - The brand the transport resolved.
 * @returns A decorative, `currentColor` SVG.
 */
export const createBrandMark = function createBrandMark(
	value: ConsentSnapshot['branding']
): SVGSVGElement {
	// The monogram's lower block cuts its letters out of the fill.
	return resolveBranding(value) === 'inth'
		? svg('0 0 88 90', INTH_MARK, { 'fill-rule': 'evenodd' })
		: svg('0 0 446 445', [C15T_MARK]);
};

/**
 * Render the "Secured by c15t" tag, or nothing.
 *
 * @param params - Branding, placement and copy.
 * @returns The anchor, or `null` when hidden.
 */
export const renderBranding = function renderBranding(
	params: BrandingParams
): HTMLElement | null {
	if (params.hide) {
		return null;
	}
	const resolved = resolveBranding(params.branding);
	const styles = classes.branding;
	const refParam =
		typeof window === 'undefined' ? '' : `?ref=${window.location.hostname}`;
	const href =
		resolved === 'inth'
			? `https://inth.com${refParam}`
			: `https://c15t.com${refParam}`;
	const { noStyle } = params;
	const className = noStyle
		? ''
		: cx(
				styles.branding,
				params.variant !== 'footer' && styles.brandingTag,
				params.variant === 'dialog-tag' && styles.brandingTagDialog,
				params.variant === 'banner-tag' && styles.brandingTagBanner
			);

	const wordmark =
		resolved === 'inth'
			? h(
					'span',
					{
						class: noStyle
							? ''
							: cx(styles.brandingWordmark, styles.brandingInth),
						dir: 'ltr',
					},
					'inth'
				)
			: h(
					'span',
					{
						class: noStyle
							? ''
							: cx(styles.brandingWordmark, styles.brandingC15T),
						dir: 'ltr',
					},
					h(
						'span',
						{ class: noStyle ? '' : styles.brandingC15TMark },
						svg('0 0 446 445', [C15T_MARK])
					),
					h(
						'span',
						{ class: noStyle ? '' : styles.brandingWordmarkLabel },
						'c15t'
					)
				);

	return h(
		'a',
		{
			class: className,
			'data-branding': resolved,
			'data-testid': params.testId,
			'data-variant': params.variant,
			href,
			rel: 'noreferrer',
			target: '_blank',
		},
		h(
			'span',
			{
				class: noStyle ? '' : styles.brandingContent,
				'data-slot': 'tag-content',
			},
			h(
				'span',
				{ class: noStyle ? '' : styles.brandingCopy },
				h(
					'span',
					{ class: noStyle ? '' : styles.brandingText },
					params.securedBy
				)
			),
			wordmark
		)
	);
};
