'use client';

/**
 * Adapter over the current `@c15t/nextjs` API. `next.config.ts` copies the
 * variant matching the installed package to `../root.tsx`, so the measured
 * fixture files stay identical on the base and head revisions.
 */
import { ConsentRoot } from '@c15t/nextjs';
import type { ConsentRootProps } from '@c15t/nextjs';

export type RootState = ConsentRootProps['state'];

export const Root = ConsentRoot;
