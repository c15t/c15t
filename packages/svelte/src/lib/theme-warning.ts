import type { Theme } from '@c15t/ui/theme';
import { DEV } from 'esm-env';

/** `Theme` keys that only reach the page as CSS variables. */
const TOKEN_KEYS = [
	'colors',
	'dark',
	'motion',
	'radius',
	'shadows',
	'spacing',
	'typography',
] as const satisfies readonly (keyof Theme)[];

/**
 * Warns in development when the provider's `theme` carries design tokens
 * the page has no stylesheet for.
 *
 * The provider applies slots and `consentActions` from `theme`, but it does
 * not turn tokens into CSS in the browser. Tokens belong in a stylesheet; an
 * app that already compiles them there should drop them from `theme`, which
 * also silences this warning. A `<style id="c15t-theme">` rendered from
 * `generateThemeCSS` counts as applied. The check is skipped in production
 * builds, where `esm-env` resolves `DEV` to `false`.
 *
 * @internal
 * @param theme - The provider's `theme` option.
 */
export const warnOnUnappliedThemeTokens = function warnOnUnappliedThemeTokens(
	theme: Theme | undefined
): void {
	if (
		!DEV ||
		!theme ||
		typeof document === 'undefined' ||
		!TOKEN_KEYS.some((key) => theme[key] !== undefined) ||
		document.getElementById('c15t-theme')
	) {
		return;
	}
	console.warn(
		'c15t: colors, radius and other tokens in the provider `theme` are ignored in the browser; `theme` applies slots and consentActions only. Put the --c15t-* variables, or the CSS from generateThemeCSS(theme), in your stylesheet and drop the tokens from `theme`. See https://c15t.com/docs/frameworks/sveltekit/quickstart'
	);
};
