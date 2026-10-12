/**
 * Where each component's rules sit in `styles.css`. Names are the flat files
 * in `dist/styles/components` (`prompt` is the consent banner, `panel` the
 * consent dialog, `manager` the preference widget, `consent-gate` the
 * ConsentGate placeholder).
 *
 * Both groups go into `styles.css`, first-paint rules first. The order
 * matters where a dialog rule and a first-paint rule match the same element
 * with the same specificity: the dialog rule wins, as it did while it
 * shipped in a stylesheet that loaded later.
 *
 * `generate-css-entrypoints.ts` fails the build when a component is in
 * neither list, so a new component needs a deliberate choice.
 */

/**
 * Surfaces a first paint can show: the banner, the dialog trigger and the
 * ConsentGate placeholder, plus the pieces they render (buttons, actions,
 * branding, legal links).
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
 * rules follow the first-paint rules in `styles.css`.
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

/** IAB banner rules, delivered with the first paint. */
export const IAB_FIRST_PAINT_COMPONENTS = ['iab-prompt'] as const;

/** IAB dialog rules, delivered when the dialog loads. */
export const IAB_DIALOG_COMPONENTS = ['iab-panel'] as const;

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
