interface C15tStylesPlugin {
	name: string;
	enforce: 'pre';
}

/**
 * Vite compatibility plugin for `@c15t/svelte`.
 *
 * The package stylesheet must still be imported by the app. The
 * `@c15t/ui` `.module.js` files export the stable alias map used by
 * React and Svelte components (`root`, `card`, `footer`, etc.), so this
 * plugin intentionally leaves those imports untouched.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { sveltekit } from '@sveltejs/kit/vite';
 * import { c15tStylesPlugin } from '@c15t/svelte/vite';
 *
 * export default defineConfig({
 *   plugins: [c15tStylesPlugin(), sveltekit()],
 *   ssr: { noExternal: ['@c15t/ui', '@c15t/svelte'] },
 * });
 * ```
 */
export function c15tStylesPlugin(): C15tStylesPlugin {
	return {
		name: 'c15t-styles',
		enforce: 'pre',
	};
}
