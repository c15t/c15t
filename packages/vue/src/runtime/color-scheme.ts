import { setupColorScheme } from '@c15t/ui/utils';

import type { ConsentConfig } from './config';

/** `key` of the Nuxt head script that sets the class before first paint. */
export const COLOR_SCHEME_SCRIPT_KEY = 'c15t-color-scheme';

const noop = (): void => undefined;

/**
 * Keep the `c15t-dark` class on `<html>` in line with `colorScheme`, the
 * way the React and Svelte providers do.
 *
 * `'light'` and `'dark'` set the class once. `'system'` follows
 * `prefers-color-scheme` as it changes. Unset mirrors a `dark` class on
 * `<html>` as it changes. `null` does nothing.
 *
 * Does nothing on the server. Where `matchMedia` is missing, as in a few
 * embedded webviews, `'system'` is light.
 *
 * @param colorScheme - The config's `colorScheme`.
 * @returns A function that stops following the system or the `dark` class.
 * @internal
 */
export const applyColorScheme = function applyColorScheme(
	colorScheme: ConsentConfig['colorScheme']
): () => void {
	if (colorScheme === null || typeof document === 'undefined') {
		return noop;
	}
	return setupColorScheme(colorScheme);
};

/**
 * Inline script that sets `c15t-dark` before the first paint.
 *
 * Nuxt renders it in the server HTML's `<head>`. `'light'` needs none,
 * because light is the absence of the class, and unset or `null` leave the
 * class to the site.
 *
 * @param colorScheme - The config's `colorScheme`.
 * @returns Script source, or an empty string when none is needed.
 * @internal
 */
export const buildColorSchemeScript = function buildColorSchemeScript(
	colorScheme: ConsentConfig['colorScheme']
): string {
	if (colorScheme === 'dark') {
		return "document.documentElement.classList.add('c15t-dark');";
	}
	if (colorScheme === 'system') {
		// `matchMedia` is missing in some embedded webviews, and a throw here
		// would stop the rest of the document from parsing.
		return "try{document.documentElement.classList.toggle('c15t-dark',matchMedia('(prefers-color-scheme:dark)').matches)}catch(e){}";
	}
	return '';
};
