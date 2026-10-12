'use client';

import { isLateEntry } from '@c15t/ui/utils/late-entry';
import { useState } from 'react';

import { useIsHydrated } from './use-is-hydrated';

interface Entry {
	shown: boolean;
	late: boolean;
}

/**
 * Whether a banner that shows now arrives after the page has painted.
 *
 * Decided once each time `shown` turns on, and held while it stays on, so a
 * re-render never restarts the entry. A banner hydrated from server HTML is
 * part of the first paint: the hook answers `false` while hydrating, which
 * also keeps the markup matching the server's.
 *
 * @param shown - Whether the banner is rendered.
 * @returns Whether to mark the mount `data-entry="late"`.
 *
 * @internal
 */
export const useLateEntry = function useLateEntry(shown: boolean): boolean {
	const clientRender = useIsHydrated();
	const decide = (): Entry => ({
		late: shown && clientRender && isLateEntry(),
		shown,
	});
	const [entry, setEntry] = useState(decide);
	if (entry.shown !== shown) {
		// Store what this render decided, the "adjust state while rendering"
		// pattern, so the answer is fixed from the mount on.
		const next = decide();
		setEntry(next);
		return next.late;
	}
	return entry.late;
};
