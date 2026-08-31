'use client';

import { ConsentManagerProvider, useConsentManager } from '@c15t/nextjs';
import type { InitialDataPromise } from '@c15t/nextjs';

const SSRStateProbe = () => {
	const { activeUI } = useConsentManager();
	return <div data-active-ui={activeUI} />;
};
export const NextjsSSRProvider = ({
	children,
	ssrData,
}: {
	children: React.ReactNode;
	ssrData: InitialDataPromise;
}) => (
	<ConsentManagerProvider
		options={{
			backendURL: '/api/bench-consent',
			mode: 'c15t',
			ssrData,
		}}
	>
		<SSRStateProbe />
		{children}
	</ConsentManagerProvider>
);
