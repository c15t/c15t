import { useEffect, useLayoutEffect } from 'react';

// useLayoutEffect logs a warning during SSR. We only need the layout-timing
// guarantee on the client, so the import is swapped at module-eval time.
export const useIsomorphicLayoutEffect =
	typeof window !== 'undefined' ? useLayoutEffect : useEffect;
