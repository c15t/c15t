import { defaultConsentConfig } from '@c15t/schema/config';

import type { ConsentConfig } from './config';

/** `id` of the `<style>` element that carries the `tokens` CSS variables. */
export const TOKENS_STYLE_ID = 'c15t-css-vars';

/**
 * The CSS that applies `tokens` as `--{key}` custom properties, over the
 * default token values the Vue components read.
 *
 * The Nuxt module and the Vue plugin add this to the page themselves. A
 * plain Vue app that renders on the server can put it in the server HTML,
 * in a `<style id="c15t-css-vars">` element, so the first paint is styled
 * before the app hydrates.
 *
 * @param tokens - Token values from the consent config. Omitted keys keep
 * their defaults.
 * @returns A CSS rule for `:root` and `:host`.
 *
 * @example
 * ```ts
 * import { generateTokensCSS } from '@c15t/vue/vue-plugin';
 *
 * const css = generateTokensCSS({ 'c15t-primary': '#2f6f4e' });
 * const head = `<style id="c15t-css-vars">${css}</style>`;
 * ```
 */
export const generateTokensCSS = function generateTokensCSS(
	tokens?: ConsentConfig['tokens']
): string {
	const declarations = Object.entries({
		...defaultConsentConfig.tokens,
		...tokens,
	})
		.filter(([, value]) => value !== undefined && value !== null)
		.map(([key, value]) => `--${key}:${String(value)};`)
		.join('');
	// Escaped the way `generateThemeCSS` escapes it, so a token value cannot
	// close the surrounding `<style>` element.
	return `:root,:host{${declarations}}`.replace(/</gu, '\\3c ');
};

/**
 * Put the token CSS in `document.head`, reusing a server-rendered element
 * with the same id.
 *
 * @returns A function that removes the element again if this call added it.
 * @internal
 */
export const mountTokensStyle = function mountTokensStyle(
	config: Pick<ConsentConfig, 'tokens'> & { nonce?: string }
): () => void {
	if (typeof document === 'undefined') {
		return () => undefined;
	}
	const existing = document.getElementById(TOKENS_STYLE_ID);
	const style = existing ?? document.createElement('style');
	style.id = TOKENS_STYLE_ID;
	if (config.nonce) {
		style.setAttribute('nonce', config.nonce);
	}
	style.textContent = generateTokensCSS(config.tokens);
	if (existing) {
		return () => undefined;
	}
	document.head.append(style);
	return () => style.remove();
};
