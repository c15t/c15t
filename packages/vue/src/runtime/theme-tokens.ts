import { defaultConsentConfig } from '@c15t/schema/config';
import { generateThemeCSS } from '@c15t/ui/theme';

import type { ConsentConfig } from './config';

/** The config fields {@link generateTokensCSS} reads besides `tokens`. */
export type TokensCSSOptions = Pick<ConsentConfig, 'colorScheme' | 'theme'>;

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
 * With a `theme` or a `colorScheme`, the CSS also carries the theme's
 * tokens and the dark tokens: under the `.c15t-dark` and `.dark` selectors,
 * in a `prefers-color-scheme: dark` media query for `'system'`, and on the
 * root for `'dark'`. The dark tokens then apply on the first paint, before
 * any script has set a class.
 *
 * @param tokens - Token values from the consent config. Omitted keys keep
 * their defaults.
 * @param options - The config's `theme` and `colorScheme`.
 * @returns CSS rules for `:root` and `:host`.
 *
 * @example
 * ```ts
 * import { generateTokensCSS } from '@c15t/vue/vue-plugin';
 *
 * const css = generateTokensCSS(
 * 	{ 'c15t-primary': '#2f6f4e' },
 * 	{ colorScheme: 'system', theme: { dark: { primary: '#7fd1a8' } } }
 * );
 * const head = `<style id="c15t-css-vars">${css}</style>`;
 * ```
 */
export const generateTokensCSS = function generateTokensCSS(
	tokens?: ConsentConfig['tokens'],
	options: TokensCSSOptions = {}
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
	const base = `:root,:host{${declarations}}`.replace(/</gu, '\\3c ');
	const { colorScheme, theme } = options;
	if (!theme && (colorScheme === undefined || colorScheme === null)) {
		return base;
	}
	// Its selectors carry one more class than `:root`, so theme and dark
	// values beat the `tokens` rule above.
	return `${base}\n${generateThemeCSS(theme ?? {}, colorScheme)}`;
};

/**
 * How many installed plugins use each `<style>` element a plugin created.
 * Server-rendered elements are not tracked: the page owns them.
 */
const pluginStyleUsers = new Map<HTMLElement, number>();

/**
 * Put the token CSS in `document.head`, reusing an element with the same
 * id that the server rendered or another app's plugin added.
 *
 * @returns A function that releases this call's use of the element. The
 * element is removed once every plugin that added or reused it has
 * released it; a server-rendered element is never removed.
 * @internal
 */
export const mountTokensStyle = function mountTokensStyle(
	config: Pick<ConsentConfig, 'colorScheme' | 'theme' | 'tokens'> & {
		nonce?: string;
	}
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
	style.textContent = generateTokensCSS(config.tokens, config);
	if (existing && !pluginStyleUsers.has(existing)) {
		return () => undefined;
	}
	if (!existing) {
		document.head.append(style);
	}
	pluginStyleUsers.set(style, (pluginStyleUsers.get(style) ?? 0) + 1);
	let released = false;
	return () => {
		if (released) {
			return;
		}
		released = true;
		const users = (pluginStyleUsers.get(style) ?? 1) - 1;
		if (users > 0) {
			pluginStyleUsers.set(style, users);
			return;
		}
		pluginStyleUsers.delete(style);
		style.remove();
	};
};
