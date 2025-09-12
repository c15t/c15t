'use client';

import { ClientSideOptionsProvider } from '@c15t/nextjs/client';
import { googleTagManager } from '@c15t/nextjs/scripts/google-tag-manager';
import { metaPixel } from '@c15t/nextjs/scripts/meta-pixel';
import { posthogConsent } from '@c15t/nextjs/scripts/posthog';

export function ConsentManagerClient({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<ClientSideOptionsProvider
			scripts={[
				googleTagManager({
					id: 'GTM-WL5L8NW7',
					script: {
						onLoad: () => {
							console.log('google-tag-manager loaded :D');
						},
					},
				}),
				posthogConsent(),
				metaPixel({
					pixelId: '123456789012345',
					script: {
						onDelete: () => {
							console.log('meta-pixel deleted');
						},
					},
				}),

				// Provider components
				// {
				// 	category: 'necessary',
				// 	type: 'standalone',
				// 	component: () => <div className="bg-green-500">Necessary</div>,
				// },
				// {
				// 	category: 'marketing',
				// 	type: 'standalone', // Does not wrap around children
				// 	component: () => {
				// 		return <div className="bg-red-500 p-4">Marketing</div>;
				// 	},
				// },
				// {
				// 	category: 'marketing',
				// 	persistAfterConsentRevoked: true, // Always rendered
				// 	type: 'standalone', // Does not wrap around children
				// 	component: (hasConsent: boolean) => {
				// 		return (
				// 			<div className="bg-teal-500 p-4">
				// 				{hasConsent
				// 					? 'Persisted Marketing'
				// 					: 'Persisted Marketing (no consent)'}
				// 			</div>
				// 		);
				// 	},
				// },
				// {
				// 	category: 'marketing',
				// 	type: 'provider',
				// 	persistAfterConsentRevoked: false,
				// 	component: (hasConsent: boolean) => {
				// 		return (
				// 			<div className="m-4 flex flex-col gap-2 bg-pink-500">
				// 				<div>
				// 					{hasConsent
				// 						? 'Persisted Marketing (provider)'
				// 						: 'Persisted Marketing (provider) (no consent)'}
				// 				</div>
				// 				{/* This will visibly wrap around the children */}
				// 				<div className="border-4 border-pink-300 border-dashed p-4">
				// 					{/* Children will be inserted here */}
				// 				</div>
				// 			</div>
				// 		);
				// 	},
				// },
			]}
			callbacks={{
				onBannerFetched(response) {
					console.log('Consent banner fetched', response);
				},
				onConsentSet(response) {
					console.log('onConsentSet', response);

					// This simulates a heavy operation that could block the click INP
					const start = performance.now();
					const end = start + 500;
					while (performance.now() < end) {
						// Intentional empty block for simulation
					}
					console.log('heavy onConsentSet callback finished');
				},
				onError(response) {
					console.log('Error', response);
				},
			}}
		>
			{children}
		</ClientSideOptionsProvider>
	);
}
