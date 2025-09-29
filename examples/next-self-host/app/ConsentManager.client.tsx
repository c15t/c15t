'use client';

import { ClientSideOptionsProvider } from '@c15t/nextjs/client';
import { gtag } from '@c15t/scripts/google-tag';
import { linkedinInsights } from '@c15t/scripts/linkedin-insights';
import { metaPixel } from '@c15t/scripts/meta-pixel';
import { microsoftUet } from '@c15t/scripts/microsoft-uet';
// import { posthogConsent } from '@c15t/scripts/posthog';
import { tiktokPixel } from '@c15t/scripts/tiktok-pixel';
import { xPixel } from '@c15t/scripts/x-pixel';

export function ConsentManagerClient({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<ClientSideOptionsProvider
			scripts={[
				xPixel({
					pixelId: 'qjlz8',
					script: {
						onLoad: () => {
							console.log('x-pixel loaded :D');
						},
						onDelete: () => {
							console.log('x-pixel deleted');
						},
					},
				}),
				gtag({
					id: 'G-TDR6LYF10M',
					category: 'measurement',
					script: {
						onLoad: () => {
							console.log('google-tag loaded :D');
						},
						onDelete: () => {
							console.log('google-tag deleted');
						},
					},
				}),
				microsoftUet({
					id: '187214157',
					script: {
						onLoad: () => {
							console.log('microsoft-uet loaded :D');
						},
						onDelete: () => {
							console.log('microsoft-uet deleted');
						},
					},
				}),
				// googleTagManager({
				// 	id: 'GTM-WL5L8NW7',
				// 	script: {
				// 		onLoad: () => {
				// 			console.log('google-tag-manager loaded :D');
				// 		},
				// 	},
				// }),
				tiktokPixel({
					pixelId: 'D38M8QJC77U6IE15NK80',
					script: {
						onLoad: () => {
							console.log('tiktok-pixel loaded :D');
						},
					},
				}),
				// posthogConsent(),
				metaPixel({
					pixelId: '123456789012345',
					script: {
						onLoad: () => {
							console.log('meta-pixel loaded :D');
						},
						onDelete: () => {
							console.log('meta-pixel deleted');
						},
					},
				}),
				linkedinInsights({
					id: '7984082',
					script: {
						onLoad: () => {
							console.log('linkedin-insights loaded!');
						},
						onDelete: () => {
							console.log('linkedin-insights deleted');
						},
					},
				}),
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
