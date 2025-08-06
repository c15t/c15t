'use client';

import { ConsentManagerCallbacks } from '@c15t/nextjs/client';
export function ClientLayout() {
	return (
		<ConsentManagerCallbacks
			callbacks={{
				onBannerFetched(response) {
					console.log('Consent banner fetched', response);
				},
				onConsentSet(response) {
					console.log('Consent has been saved locally', response);
				},
				onError(response) {
					console.log('Error', response);
				},
			}}
		/>
	);
}
