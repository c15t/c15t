/**
 * Which stylesheet each component's rules go into. Names are the flat files
 * in `dist/styles/components` (`prompt` is the consent banner, `panel` the
 * consent dialog, `manager` the preference widget, `consent-gate` the
 * ConsentGate placeholder).
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
	'consent-gate',
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

/**
 * Tailwind 4's layer order: it emits `@layer properties;` and then
 * `@layer theme, base, components, utilities;`. Layers rank by first
 * mention, so a sheet that reaches the page before Tailwind's would declare
 * `components` first and rank it below `base`, where preflight zeroes the
 * banner's padding and borders. Every layered stylesheet opens with the
 * full order, so `components` lands between `base` and `utilities`
 * whichever sheet loads first. Without Tailwind the other four layers stay
 * empty. `@c15t/ui/postcss-tailwind3` removes the statement with the blocks.
 *
 * That covers the aggregates (`styles.css` loaded above the app's own CSS,
 * or injected by Astro from `page-ssr`) and the per-component sheets Vue
 * imports, which Vite links ahead of the app's stylesheet when they live in
 * a shared chunk.
 */
export const LAYER_ORDER =
	'@layer properties, theme, base, components, utilities;';
