/**
 * The Vue dialog surface.
 *
 * Same trade as the React adapter: a site already running Vue reuses that
 * runtime for the preference centre instead of downloading Svelte for one
 * dialog. Sites on neither should stay on the default.
 *
 * The island is mounted as its own Vue app rather than grafted onto the
 * host app — Astro islands never share an app instance. The consent state
 * lives on the page runtime, which the `c15tVue` plugin borrows: it builds
 * no kernel of its own and disposes nothing.
 *
 * The island itself is registered by the integration rather than imported
 * here: a `.vue` file can only be compiled by the consuming app's build,
 * and only that build knows whether `@astrojs/vue` is present.
 */

import type {
	ConsentDialogAdapter,
	ConsentDialogContext,
	ConsentDialogHandle,
} from './adapter';
import { requireDialogSurface } from './adapter';
import { buildProviderProps } from './provider-props';

/** The Vue 3 dialog surface implementation. */
export const vueDialogAdapter: ConsentDialogAdapter = {
	async mount(context: ConsentDialogContext): Promise<ConsentDialogHandle> {
		const [{ createApp }, { c15tVue }, surface] = await Promise.all([
			import('vue'),
			import('@c15t/vue/vue-plugin'),
			requireDialogSurface('vue')(),
		]);

		const { options, runtime } = buildProviderProps(
			context.runtime,
			context.options
		);
		const app = createApp(surface.default as never, { kind: context.kind });
		app.use(c15tVue, { ...options, runtime } as never);
		app.mount(context.target);

		return {
			close() {
				context.runtime.kernel.set.activeUI('none');
			},
			destroy() {
				app.unmount();
			},
		};
	},

	name: 'vue',

	async preload() {
		await Promise.all([
			import('vue'),
			import('@c15t/vue/vue-plugin'),
			requireDialogSurface('vue')(),
		]);
	},
};
