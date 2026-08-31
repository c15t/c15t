'use client';

import { ConsentManagerProvider, useConsentManager } from '@c15t/nextjs';
import type { InitialDataPromise } from '@c15t/nextjs';

export const NextjsSSRProvider = ({
	children,
	ssrData,
}: {
	children: React.ReactNode;
	ssrData: InitialDataPromise;
}) => {
	return (
		<ConsentManagerProvider
			options={{
				mode: 'c15t',
				backendURL: '/api/bench-consent',
				ssrData,
			}}
		>
			<SSRStateProbe />
			{children}
		</ConsentManagerProvider>
	);
};

const SSRStateProbe = () => {
	const { activeUI } = useConsentManager();
	return <div data-active-ui={activeUI} />;
};
