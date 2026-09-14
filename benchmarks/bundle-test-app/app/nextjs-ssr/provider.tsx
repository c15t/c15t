'use client';

import { ConsentRoot, useActiveUI } from '@c15t/nextjs';
import type { ConsentRootProps } from '@c15t/nextjs';

const SSRStateProbe = () => {
	const activeUI = useActiveUI();
	return <div data-active-ui={activeUI} />;
};
export const NextjsSSRProvider = ({
	children,
	state,
}: {
	children: React.ReactNode;
	state: ConsentRootProps['state'];
}) => (
	<ConsentRoot
		backendURL="/api/bench-consent"
		state={state}
	>
		<SSRStateProbe />
		{children}
	</ConsentRoot>
);
