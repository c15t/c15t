/**
 * The on-demand React dialog island.
 *
 * Mounted with `createRoot()` the first time something opens a dialog —
 * never with `client:load` — so a visitor who never opens the preference
 * centre downloads no React from us at all.
 *
 * The provider renders against the page's runtime rather than building one
 * of its own: Astro islands cannot see each other's context, so the kernel
 * has to be owned outside the component tree. `<ConsentProvider runtime>`
 * borrows it and leaves `start()`/`dispose()` to the owner.
 *
 * `<ConsentDraftProvider>` is what makes Save work. `useConsentDraft()`
 * falls back to a draft per hook call when no provider is in scope, so the
 * category toggles and the Save button would each stage into their own
 * copy: the switch would flip, and the save would commit nothing.
 */

import type { ConsentRuntime } from '@c15t/core/runtime';
import {
	ConsentDialog,
	ConsentDraftProvider,
	ConsentProvider,
} from '@c15t/react';
import { lazy, Suspense } from 'react';

import type { DialogPresentationOptions } from '../../ui/provider-props';

// The TCF surface is the larger half of this island and only an IAB site
// ever opens it, so it arrives on its own chunk.
const IABDialogSurface = lazy(() => import('./iab-dialog-surface'));

/** Props the React dialog adapter passes in. */
export interface ConsentDialogSurfaceProps {
	/** The page-level runtime. The provider borrows it, it does not own it. */
	runtime: ConsentRuntime;
	/** Presentation options forwarded to the provider. */
	options: DialogPresentationOptions;
	/** Which dialog to render. */
	kind?: 'preferences' | 'iab';
}

const ConsentDialogSurface = ({
	runtime,
	options,
	kind = 'preferences',
}: ConsentDialogSurfaceProps) => (
	<ConsentProvider
		runtime={runtime}
		options={options}
	>
		{kind === 'iab' ? (
			<Suspense fallback={null}>
				<IABDialogSurface />
			</Suspense>
		) : (
			<ConsentDraftProvider>
				<ConsentDialog />
			</ConsentDraftProvider>
		)}
	</ConsentProvider>
);

export default ConsentDialogSurface;
