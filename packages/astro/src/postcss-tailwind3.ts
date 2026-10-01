/**
 * Tailwind 3 PostCSS plugin for c15t stylesheets, re-exported from
 * `@c15t/ui/postcss-tailwind3` so an app that installs `@c15t/astro` can list
 * `@c15t/astro/postcss-tailwind3` without installing `@c15t/ui`.
 * See `@c15t/ui/postcss-tailwind3` for what the plugin does. It must come
 * before `tailwindcss`.
 *
 * @example
 * ```js
 * // postcss.config.mjs
 * export default {
 * 	plugins: {
 * 		'@c15t/astro/postcss-tailwind3': {},
 * 		tailwindcss: {},
 * 		autoprefixer: {},
 * 	},
 * };
 * ```
 */
export * from '@c15t/ui/postcss-tailwind3';
export { default } from '@c15t/ui/postcss-tailwind3';
