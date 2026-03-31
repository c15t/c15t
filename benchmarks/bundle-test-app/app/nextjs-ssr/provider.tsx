'use client';

import {
	ConsentManagerProvider,
	type InitialDataPromise,
	useConsentManager,
} from '@c15t/nextjs';

export function NextjsSSRProvider({
	children,
	ssrData,
}: {
	children: React.ReactNode;
	ssrData: InitialDataPromise;
}) {
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
}

function SSRStateProbe() {
	const { activeUI } = useConsentManager();
	return <div data-active-ui={activeUI} />;
}
