/**
 * CSS injection for the embed script.
 *
 * Imports the compiled CSS and class name maps from @c15t/ui dist,
 * plus the default theme CSS variables via generateThemeCSS().
 * This ensures visual parity with the React components — same CSS, same class names.
 */

// Import CSS as text strings (via esbuild --loader:.module.css=text)
// @ts-expect-error - CSS text import
import bannerCSS from '../../../ui/dist/styles/components/consent-banner.module.css';
// @ts-expect-error - direct dist path import
import bannerClasses from '../../../ui/dist/styles/components/consent-banner.module.js';
// @ts-expect-error - CSS text import
import dialogCSS from '../../../ui/dist/styles/components/consent-dialog.module.css';
// @ts-expect-error - direct dist path import
import dialogClasses from '../../../ui/dist/styles/components/consent-dialog.module.js';
// @ts-expect-error - CSS text import
import widgetCSS from '../../../ui/dist/styles/components/consent-widget.module.css';
// @ts-expect-error - direct dist path import
import widgetClasses from '../../../ui/dist/styles/components/consent-widget.module.js';
// @ts-expect-error - CSS text import
import buttonCSS from '../../../ui/dist/styles/primitives/button.module.css';
// @ts-expect-error - direct dist path import
import buttonClasses from '../../../ui/dist/styles/primitives/button.module.js';
// @ts-expect-error - CSS text import
import switchCSS from '../../../ui/dist/styles/primitives/switch.module.css';
// @ts-expect-error - direct dist path import
import switchClasses from '../../../ui/dist/styles/primitives/switch.module.js';
// @ts-expect-error - direct source path import (dist exports are minified)
import { defaultTheme, generateThemeCSS } from '../../../ui/src/theme/utils';

export const bannerStyles = bannerClasses as Record<string, string>;
export const dialogStyles = dialogClasses as Record<string, string>;
export const widgetStyles = widgetClasses as Record<string, string>;
export const buttonStyles = buttonClasses as Record<string, string>;
export const switchStyles = switchClasses as Record<string, string>;

let injected = false;

/**
 * Injects all c15t UI CSS into the page.
 * Includes the base theme CSS variables (from defaultTheme) + all component CSS.
 */
export function injectC15tCSS(): void {
	if (injected) return;
	injected = true;

	// Generate the base theme CSS variables from @c15t/ui's defaultTheme
	// This is the same function the React provider uses to set --c15t-* variables
	const themeCSS = generateThemeCSS(defaultTheme);

	const style = document.createElement('style');
	style.id = 'c15t-embed-styles';
	style.textContent = [
		themeCSS,
		bannerCSS,
		dialogCSS,
		widgetCSS,
		buttonCSS,
		switchCSS,
	].join('\n');
	document.head.appendChild(style);
}
