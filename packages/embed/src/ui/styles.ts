/**
 * CSS injection for the embed script.
 *
 * Loads CSS via a <link> tag (separate c15t.css file) instead of CSS-in-JS.
 * Theme variables are injected as a tiny <style> block (~1KB).
 * Class name maps are imported from @c15t/ui dist for DOM construction.
 */

// @ts-expect-error - direct dist path import
import bannerClasses from '../../../ui/dist/styles/components/consent-banner.module.js';
// @ts-expect-error - direct dist path import
import dialogClasses from '../../../ui/dist/styles/components/consent-dialog.module.js';
// @ts-expect-error - direct dist path import
import widgetClasses from '../../../ui/dist/styles/components/consent-widget.module.js';
// @ts-expect-error - direct dist path import
import buttonClasses from '../../../ui/dist/styles/primitives/button.module.js';
// @ts-expect-error - direct dist path import
import switchClasses from '../../../ui/dist/styles/primitives/switch.module.js';
// @ts-expect-error - direct source path import
import { defaultTheme, generateThemeCSS } from '../../../ui/src/theme/utils';

export const bannerStyles = bannerClasses as Record<string, string>;
export const dialogStyles = dialogClasses as Record<string, string>;
export const widgetStyles = widgetClasses as Record<string, string>;
export const buttonStyles = buttonClasses as Record<string, string>;
export const switchStyles = switchClasses as Record<string, string>;

let injected = false;

/**
 * Injects c15t CSS into the page:
 * 1. A <link> tag for the main c15t.css (component styles from @c15t/ui)
 * 2. A tiny <style> tag for theme variables (from defaultTheme)
 *
 * The CSS URL is derived from the embed script's own URL (sibling file).
 */
export function injectC15tCSS(): void {
	if (injected) return;
	injected = true;

	// Inject the component CSS via <link> — loaded as a separate cacheable file
	const scriptEl = document.querySelector(
		'script[data-backend]'
	) as HTMLScriptElement | null;
	if (scriptEl?.src) {
		const cssUrl = scriptEl.src.replace(/\.js$/, '.css');
		const link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href = cssUrl;
		link.id = 'c15t-embed-styles';
		document.head.appendChild(link);
	}

	// Inject theme variables as a tiny inline <style> (~1KB)
	// These are the --c15t-* CSS variables that the component CSS references
	const themeCSS = generateThemeCSS(defaultTheme);
	const style = document.createElement('style');
	style.id = 'c15t-embed-theme';
	style.textContent = themeCSS;
	document.head.appendChild(style);
}
