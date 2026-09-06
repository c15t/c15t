/**
 * The Svelte dialog surface.
 *
 * Svelte 5 compiles to close to hand-written DOM code, so a Svelte island is
 * the smallest way to get a real preference centre onto an Astro page
 * without shipping a framework runtime to visitors who never open one.
 * Mounting happens on the first open through `mount()`, so the import cost
 * is paid only by people who click "Customize".
 *
 * The island itself is registered by `<ConsentDialog />` rather than
 * imported here: a `.svelte` file can only be compiled by the consuming
 * app's build, and keeping the specifier in the `.astro` component is what
 * lets that build see it.
 *
 * The provider inside the island renders against the page runtime through
 * its `runtime` prop, so there is one kernel per page no matter how many
 * islands, scripts or frameworks read it.
 */

import type {
	ConsentDialogAdapter,
	ConsentDialogContext,
	ConsentDialogHandle,
} from './adapter';
import { requireDialogSurface } from './adapter';
import { buildProviderProps } from './provider-props';

/** The Svelte 5 dialog surface implementation. */
export const svelteDialogAdapter: ConsentDialogAdapter = {
	async mount(context: ConsentDialogContext): Promise<ConsentDialogHandle> {
		const [{ mount, unmount }, surface] = await Promise.all([
			import('svelte'),
			requireDialogSurface('svelte')(),
		]);

		const component = mount(surface.default as never, {
			props: {
				...buildProviderProps(context.runtime, context.options),
				kind: context.kind,
				tab: context.tab,
			},
			target: context.target,
		});

		return {
			close() {
				context.runtime.kernel.set.activeUI('none');
			},
			async destroy() {
				await unmount(component, { outro: true });
			},
		};
	},

	name: 'svelte',

	async preload() {
		await Promise.all([import('svelte'), requireDialogSurface('svelte')()]);
	},
};
