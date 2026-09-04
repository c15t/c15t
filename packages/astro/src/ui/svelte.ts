/**
 * The Svelte dialog surface.
 *
 * Svelte 5 compiles to close to hand-written DOM code, so a Svelte island
 * is the smallest way to get a real preference centre onto an Astro page
 * without shipping a framework runtime to visitors who never open one.
 * Mounting happens on the first open through `mount()`, so the import cost
 * is paid only by people who click "Customize".
 */

import type {
	ConsentDialogAdapter,
	ConsentDialogContext,
	ConsentDialogHandle,
} from './adapter';
import { buildProviderProps } from './provider-props';

/** The Svelte 5 dialog surface implementation. */
export const svelteDialogAdapter: ConsentDialogAdapter = {
	async mount(context: ConsentDialogContext): Promise<ConsentDialogHandle> {
		const [{ mount, unmount }, surface] = await Promise.all([
			import('svelte'),
			import('@c15t/astro/islands/consent-dialog-surface.svelte') as Promise<{
				default: unknown;
			}>,
		]);

		const component = mount(surface.default as never, {
			props: {
				kind: context.kind,
				providerProps: buildProviderProps(context.runtime, context.options),
				runtime: context.runtime,
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
		await Promise.all([
			import('svelte'),
			import('@c15t/astro/islands/consent-dialog-surface.svelte'),
		]);
	},
};
