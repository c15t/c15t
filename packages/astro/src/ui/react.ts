/**
 * The React dialog surface.
 *
 * For a site that already ships React, mounting the preference centre in
 * React costs nothing new: the runtime is on the page already, and the
 * dialog reuses it instead of pulling a second framework alongside it. A
 * site that does not ship React should stay on the Svelte default, which
 * is roughly a third of the runtime weight.
 *
 * Mounting happens on the first open through `mount()`, so the island's
 * chunks are paid for only by visitors who click "Customize".
 *
 * The island itself is registered by the integration rather than imported
 * here: a `.tsx` file can only be compiled by the consuming app's build,
 * and only that build knows whether `@astrojs/react` is present.
 */

import type {
	ConsentDialogAdapter,
	ConsentDialogContext,
	ConsentDialogHandle,
} from './adapter';
import { requireDialogSurface } from './adapter';
import { buildProviderProps } from './provider-props';

/** The React 18/19 dialog surface implementation. */
export const reactDialogAdapter: ConsentDialogAdapter = {
	async mount(context: ConsentDialogContext): Promise<ConsentDialogHandle> {
		const [{ createElement }, { createRoot }, surface] = await Promise.all([
			import('react'),
			import('react-dom/client'),
			requireDialogSurface('react')(),
		]);

		const root = createRoot(context.target);
		root.render(
			createElement(surface.default as never, {
				...buildProviderProps(context.runtime, context.options),
				kind: context.kind,
			})
		);

		return {
			close() {
				context.runtime.kernel.set.activeUI('none');
			},
			destroy() {
				root.unmount();
			},
		};
	},

	name: 'react',

	async preload() {
		await Promise.all([
			import('react'),
			import('react-dom/client'),
			requireDialogSurface('react')(),
		]);
	},
};
