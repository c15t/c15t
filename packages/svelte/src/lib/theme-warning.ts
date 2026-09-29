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
 * not turn tokens into CSS in the browser. Without a `<style id="c15t-theme">`
 * rendered from `generateThemeCSS`, the tokens do nothing, silently. The
 * check is skipped in production builds, where `esm-env` resolves `DEV` to
 * `false`.
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
		'c15t: `theme` tokens are not turned into CSS in the browser, so these colors, radii and other tokens have no effect. Render generateThemeCSS(theme) from @c15t/ui/theme as <style id="c15t-theme"> in <svelte:head> from a server load, or put its output in your stylesheet. Slots and consentActions still apply from the provider. See https://c15t.com/docs/frameworks/sveltekit/quickstart'
	);
};
