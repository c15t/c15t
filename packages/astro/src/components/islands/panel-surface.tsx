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
import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';

import type { DialogPresentationOptions } from '../../ui/provider-props';
import type { IABDialogSurfaceProps } from './iab-dialog-surface';

// The TCF surface is the larger half of this island and only an IAB site
// ever opens it, so it arrives on its own chunk.
let loadedIABSurface: ComponentType<IABDialogSurfaceProps> | undefined;
let iabSurfacePromise:
	| Promise<ComponentType<IABDialogSurfaceProps>>
	| undefined;
const loadIABSurface = () => {
	iabSurfacePromise ??= (async () => {
		const module = await import('./iab-dialog-surface');
		loadedIABSurface = module.default;
		return loadedIABSurface;
	})();
	return iabSurfacePromise;
};

// This island only mounts in the browser. Resolve its component through state
// so the first open does not wait for React's Suspense retry throttle.
const IABDialogSurface = (props: IABDialogSurfaceProps) => {
	const [loadedComponent, setLoadedComponent] = useState(
		() => loadedIABSurface
	);
	const [failure, setFailure] = useState<{ error: unknown }>();
	useEffect(() => {
		if (loadedComponent) {
			return;
		}
		let active = true;
		void (async () => {
			try {
				const loaded = await loadIABSurface();
				if (active) {
					setLoadedComponent(() => loaded);
				}
			} catch (error) {
				if (active) {
					setFailure({ error });
				}
			}
		})();
		return () => {
			active = false;
		};
	}, [loadedComponent]);
	if (failure) {
		throw failure.error;
	}
	const Component = loadedComponent;
	return Component ? <Component {...props} /> : null;
};

/** Props the React dialog adapter passes in. */
export interface ConsentDialogSurfaceProps {
	/** The page-level runtime. The provider borrows it, it does not own it. */
	runtime: ConsentRuntime;
	/** Presentation options forwarded to the provider. */
	options: DialogPresentationOptions;
	/** Which dialog to render. */
	kind?: 'preferences' | 'iab';
	/** Which IAB preference-centre tab to open on. */
	tab?: 'purposes' | 'vendors';
}

const ConsentDialogSurface = ({
	runtime,
	options,
	kind = 'preferences',
	tab,
}: ConsentDialogSurfaceProps) => (
	<ConsentProvider
		runtime={runtime}
		options={options}
	>
		{kind === 'iab' ? (
			<IABDialogSurface tab={tab} />
		) : (
			<ConsentDraftProvider>
				<ConsentDialog />
			</ConsentDraftProvider>
		)}
	</ConsentProvider>
);

export default ConsentDialogSurface;
