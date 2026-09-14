'use client';

import { useActiveUI } from '@c15t/nextjs';

import { Root } from './consent-api/root';
import type { RootState } from './consent-api/root';

const SSRStateProbe = () => {
	const activeUI = useActiveUI();
	return <div data-active-ui={activeUI} />;
};
export const NextjsSSRProvider = ({
	children,
	state,
}: {
	children: React.ReactNode;
	state: RootState;
}) => (
	<Root
		backendURL="/api/bench-consent"
		state={state}
	>
		<SSRStateProbe />
		{children}
	</Root>
);
