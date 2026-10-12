'use client';

/**
 * Adapter over the pre-`ConsentRoot` API. `next.config.ts` copies it to
 * `../root.tsx` on a base revision that still ships `ConsentBoundary`;
 * `tsconfig.json` excludes the variant directories so neither side has to
 * type-check the other's imports.
 */
import { ConsentBoundary } from '@c15t/nextjs';
import type { ConsentBoundaryProps } from '@c15t/nextjs';
import type { ComponentProps } from 'react';

export type RootState = ConsentBoundaryProps['config'];

export const Root = ({
	state,
	...rest
}: Omit<ComponentProps<typeof ConsentBoundary>, 'config'> & {
	state: RootState;
}) => (
	<ConsentBoundary
		config={state}
		{...rest}
	/>
);
