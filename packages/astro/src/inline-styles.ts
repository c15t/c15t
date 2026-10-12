/**
 * The first-paint rules the Astro components inline into the HTML.
 *
 * `@c15t/ui`'s first-paint sheet, plus the rule from `styles.css` that lets
 * the `hidden` attribute hide the banner: the browser runtime shows and
 * hides the banner with that attribute, and the banner's own `display`
 * would otherwise beat the user-agent rule for `[hidden]`.
 */
import { css as firstPaintCSS } from '@c15t/ui/styles/sheets/first-paint';
import {
	css as iabFirstPaintCSS,
	id as iabFirstPaintID,
} from '@c15t/ui/styles/sheets/iab-first-paint';

/** Marks the inlined `<style>`, as the React and Svelte surfaces do. */
export const INLINE_STYLES_ID = 'c15t-first-paint';

const HIDDEN_BANNER_CSS =
	'[data-testid=consent-banner-root][hidden],[data-testid=consent-banner-overlay][hidden],[data-testid=iab-consent-banner-root][hidden],[data-testid=iab-consent-banner-overlay][hidden]{display:none!important}';

/** The text of the inlined `<style>`. */
export const INLINE_STYLES_CSS = `${firstPaintCSS}\n${HIDDEN_BANNER_CSS}`;

/** Marks the IAB banner's inlined first-paint rules. */
export const INLINE_IAB_STYLES_ID = iabFirstPaintID;

/** IAB variables and banner rules; the preference centre loads on demand. */
export const INLINE_IAB_STYLES_CSS = iabFirstPaintCSS;
