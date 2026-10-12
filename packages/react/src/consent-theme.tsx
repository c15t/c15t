/**
 * Server-renderable theme stylesheet.
 *
 * Deliberately not a client component: render it from a Server Component
 * (a Next.js App Router layout, for example) and the theme generator and
 * the default theme stay out of the browser bundle. Rendered from a client
 * component it still works, but ships the generator.
 */
import { defaultTheme, generateThemeCSS } from '@c15t/ui/theme';

import type { Theme } from './types/theme';

/** Props for {@link ConsentTheme}. */
export interface ConsentThemeProps {
	/**
	 * Theme tokens: colors, dark colors, typography, spacing, radius,
	 * shadows and motion. Defaults to the built-in theme, which the package
	 * stylesheet already contains, so omit it only to pick a `colorScheme`
	 * before hydration.
	 */
	theme?: Theme;
	/**
	 * Color scheme to apply before hydration. `'dark'` makes the dark
	 * tokens the default, and `'system'` follows `prefers-color-scheme`.
	 * Omit it to follow the `dark` / `c15t-dark` class on `<html>`. Pass the
	 * same value as the provider's `colorScheme` option.
	 */
	colorScheme?: 'light' | 'dark' | 'system' | null;
	/** Content Security Policy nonce for the `<style>` element. */
	nonce?: string;
}

/**
 * Renders the `--c15t-*` CSS variables for a theme as a `<style>` element.
 *
 * Render it once, next to the consent provider, where your framework renders
 * on the server. The provider does not generate theme CSS itself.
 *
 * @param props - The theme, color scheme and CSP nonce.
 * @returns A `<style id="c15t-theme">` element.
 * @example
 * ```tsx
 * // app/layout.tsx (Server Component)
 * import { ConsentTheme } from '@c15t/nextjs';
 * import { theme } from './consent-theme';
 *
 * <ConsentTheme theme={theme} colorScheme="system" />
 * ```
 */
export const ConsentTheme = ({
	theme,
	colorScheme,
	nonce,
}: ConsentThemeProps) => (
	<style
		id="c15t-theme"
		nonce={nonce}
		// oxlint-disable-next-line react/no-danger -- generateThemeCSS escapes `<`
		dangerouslySetInnerHTML={{
			__html: generateThemeCSS(theme ?? defaultTheme, colorScheme),
		}}
	/>
);
