'use client';

import { ConsentManagerCallbacks } from '@c15t/nextjs/client';

export function ConsentManagerClient({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<>
			<ConsentManagerCallbacks
				callbacks={{
					onBannerFetched(response) {
						console.log('Consent banner fetched', response);
					},
					onConsentSet(response) {
						console.log('onConsentSet', response);

						// This simulates a heavy operation that could block the click INP
						const start = performance.now();
						const end = start + 500;
						// biome-ignore lint/suspicious/noEmptyBlockStatements: <explanation>
						while (performance.now() < end) {}
						console.log('heavy onConsentSet callback finished');
					},
					onError(response) {
						console.log('Error', response);
					},
				}}
			/>
			{children}
		</>
	);
}
