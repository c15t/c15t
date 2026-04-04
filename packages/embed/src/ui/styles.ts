/**
 * CSS injection for the embed script.
 *
 * Imports the compiled CSS and class name maps from @c15t/ui dist.
 * This ensures visual parity with the React components — same CSS, same class names.
 */

// Import CSS as text strings (via esbuild --loader:.css=text)
// @ts-expect-error - CSS text import
import bannerCSS from '../../../ui/dist/styles/components/consent-banner.module.css';
// Import class name maps (JS modules — esbuild resolves these fine)
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

export const bannerStyles = bannerClasses as Record<string, string>;
export const dialogStyles = dialogClasses as Record<string, string>;
export const widgetStyles = widgetClasses as Record<string, string>;
export const buttonStyles = buttonClasses as Record<string, string>;
export const switchStyles = switchClasses as Record<string, string>;

let injected = false;

/**
 * Injects all c15t UI CSS into the page.
 * Uses the exact same compiled CSS that the React components use.
 */
export function injectC15tCSS(): void {
	if (injected) return;
	injected = true;

	const style = document.createElement('style');
	style.id = 'c15t-embed-styles';
	style.textContent = [
		bannerCSS,
		dialogCSS,
		widgetCSS,
		buttonCSS,
		switchCSS,
	].join('\n');
	document.head.appendChild(style);
}
