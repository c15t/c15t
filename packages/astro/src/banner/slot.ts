/**
 * Marks where `<ConsentBanner />` would have rendered, carrying its props as
 * JSON, so the browser can render the banner in the same spot.
 *
 * Its own module so the boot script can look for the spot without pulling
 * in the banner's class maps and stylesheet.
 */
export const PROMPT_SLOT_ATTRIBUTE = 'data-c15t-prompt-slot';

/** The same, for `<IABConsentBanner />`. */
export const IAB_PROMPT_SLOT_ATTRIBUTE = 'data-c15t-iab-prompt-slot';

/**
 * The consent models an `<IABConsentBanner />` spot answers, so the boot
 * script can pick the IAB banner over the standard one without loading
 * either renderer first.
 *
 * @param spot - The spot the IAB banner left.
 * @returns The models from its `models` prop, or `['iab']`.
 */
export const readIABSpotModels = function readIABSpotModels(
	spot: Element
): string[] {
	try {
		const data = JSON.parse(spot.getAttribute(IAB_PROMPT_SLOT_ATTRIBUTE) ?? '');
		const models: unknown = data?.props?.models;
		return Array.isArray(models) ? models.map(String) : ['iab'];
	} catch {
		return ['iab'];
	}
};
