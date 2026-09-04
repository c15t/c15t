'use client';

import { ConsentBoundary, useActiveUI } from '@c15t/nextjs';
import type { ConsentBoundaryProps } from '@c15t/nextjs';

const SSRStateProbe = () => {
	const activeUI = useActiveUI();
	return <div data-active-ui={activeUI} />;
};
export const NextjsSSRProvider = ({
	children,
	config,
}: {
	children: React.ReactNode;
	config: ConsentBoundaryProps['config'];
}) => (
	<ConsentBoundary
		backendURL="/api/bench-consent"
		config={config}
	>
		<SSRStateProbe />
		{children}
	</ConsentBoundary>
);
