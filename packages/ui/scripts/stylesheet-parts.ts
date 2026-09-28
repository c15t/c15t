/**
 * Which stylesheet each component's rules go into. Names are the flat files
 * in `dist/styles/components` (`prompt` is the consent banner, `panel` the
 * consent dialog, `manager` the preference widget, `frame` ConsentGate).
 *
 * `generate-css-entrypoints.ts` fails the build when a component is in
 * neither list, so a new component needs a deliberate choice.
 */

/**
 * Surfaces a first paint can show: the banner, the dialog trigger and the
 * ConsentGate placeholder, plus the pieces they render (buttons, actions,
 * branding, legal links). Their rules go into the render-blocking
 * `styles.css`.
 */
export const FIRST_PAINT_COMPONENTS = [
	'branding',
	'button',
	'consent-actions',
	'frame',
	'legal-links',
	'panel-trigger',
	'prompt',
] as const;

/**
 * Rendered only inside the consent dialog or the preference widget. Their
 * rules go into `styles/dialog.css`, which the dialog's module imports so the
 * bundler ships it with the dialog chunk.
 */
export const DIALOG_COMPONENTS = [
	'accordion',
	'collapsible',
	'manager',
	'panel',
	'preference-item',
	'switch',
	'tabs',
	'vendor-list',
] as const;

/** Prefix of the IAB TCF components, which go into `iab/styles.css`. */
export const IAB_PREFIX = 'iab-';
