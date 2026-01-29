'use client';

import { ClientSideOptionsProvider } from '@c15t/nextjs/client';
import { googleTagManager } from '@c15t/scripts/google-tag-manager';
import { linkedinInsights } from '@c15t/scripts/linkedin-insights';
import { metaPixel } from '@c15t/scripts/meta-pixel';
import posthog from 'posthog-js';
import type { ReactNode } from 'react';
/**
 * Client-side consent manager wrapper for handling scripts and callbacks
 *
 * This component is rendered on the client and provides the ability to:
 * - Load integration scripts (Google Tag Manager, Meta Pixel, TikTok Pixel, etc.)
 * - Handle client-side callbacks (onConsentSet, onError, onBannerFetched)
 * - Manage script lifecycle (onLoad, onDelete)
 *
 * @param props - Component properties
 * @param props.children - Child components to render within the client-side context
 *
 * @returns The client-side options provider with children
 *
 * @see https://c15t.com/docs/frameworks/next/callbacks
 * @see https://c15t.com/docs/frameworks/next/script-loader
 */
export function ConsentManagerClient({ children }: { children: ReactNode }) {
	return (
		<ClientSideOptionsProvider
			// 📝 Add your integration scripts here
			// Scripts are loaded when consent is given and removed when consent is revoked
			scripts={[
				googleTagManager({
					id: 'GTM-WL5L8NW7',
					script: {
						vendorId: 1,
						onBeforeLoad: ({ consents, elementId, ...rest }) => {
							console.log('GTM loaded');
						},
					},
				}),
				metaPixel({
					pixelId: '1767125683972825',
					script: {
						vendorId: 1,
					},
				}),
				linkedinInsights({
					id: '123456789012345',
					script: {
						vendorId: 'internal-analytics',
					},
				}),
			]}
			// 📝 Add your callbacks here
			// Callbacks allow you to react to consent events
			callbacks={{
				onConsentSet({ preferences }) {
					console.log('onConsentSet', preferences);
					const phStatus = posthog.get_explicit_consent_status();
					if (preferences.measurement && phStatus !== 'granted') {
						// posthog.set_config({
						//   capture_performance: true,
						//   disable_session_recording: false,
						// });
						posthog.opt_in_capturing();
						posthog.startSessionRecording();
						console.log('opt_in_capturing');
					} else if (!preferences.measurement && phStatus !== 'denied') {
						// posthog.set_config({
						//   capture_performance: false,
						//   disable_session_recording: true,
						// });
						posthog.stopSessionRecording();
						posthog.opt_out_capturing();
						console.log('opt_out_capturing');
					}
				},
			}}
		>
			{children}
		</ClientSideOptionsProvider>
	);
}
