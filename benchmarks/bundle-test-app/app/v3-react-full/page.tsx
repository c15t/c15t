'use client';

import '@c15t/react/styles.css';

/**
 * /v3-react-full — interactive test harness for the v3 stack.
 *
 * What to do here:
 * - Open DevTools → Network tab.
 * - Click "Accept marketing" — Meta Pixel + FB SDK requests appear.
 * - Click "Revoke marketing" — the <script> tags are removed (filter by
 *   "facebook" or "google-analytics" in the DOM tree).
 * - Toggle measurement — GTM, Hotjar, GA load/unload on their own.
 *
 * Every mutation flows through the v3 kernel → the script-loader
 * module reconciles DOM in <10 µs. Check the "Loaded scripts" panel
 * below for live confirmation.
 */

import type { Script } from '@c15t/core/v3/modules/script-loader';
import {
	ConsentBanner,
	ConsentDialog,
	ConsentDraftProvider,
	ConsentProvider,
	ConsentWidget,
} from '@c15t/react/v3';
import { lazy, Suspense } from 'react';

const Diagnostics = lazy(() => import('./diagnostics'));

/**
 * Realistic tracking stack. Each script is gated by a consent category.
 * Meta Pixel + FB SDK need `marketing`. GTM/Hotjar/GA need `measurement`.
 * Intercom needs `functionality`. Change consent and watch them load.
 */
const DEMO_SCRIPTS: Script[] = [
	{
		id: 'gtm',
		src: 'https://www.googletagmanager.com/gtm.js?id=GTM-DEMO',
		category: 'measurement',
		async: true,
	},
	{
		id: 'ga',
		src: 'https://www.google-analytics.com/analytics.js',
		category: 'measurement',
		async: true,
	},
	{
		id: 'hotjar',
		src: 'https://static.hotjar.com/c/hotjar.js',
		category: 'measurement',
		async: true,
	},
	{
		id: 'fb-pixel',
		src: 'https://connect.facebook.net/en_US/fbevents.js',
		category: 'marketing',
		async: true,
	},
	{
		id: 'fb-sdk',
		src: 'https://connect.facebook.net/en_US/sdk.js',
		category: 'marketing',
		async: true,
	},
	{
		id: 'linkedin-insight',
		src: 'https://snap.licdn.com/li.lms-analytics/insight.min.js',
		category: 'marketing',
		async: true,
	},
	{
		id: 'intercom',
		src: 'https://widget.intercom.io/widget.js',
		category: 'functionality',
		async: true,
	},
];

export default function V3ReactFullPage() {
	return (
		<ConsentProvider
			options={{
				mode: 'offline',
				scripts: DEMO_SCRIPTS,
				networkBlocker: {
					rules: [
						{ domain: 'google-analytics.com', category: 'measurement' },
						{ domain: 'facebook.net', category: 'marketing' },
						{ domain: 'hotjar.com', category: 'measurement' },
					],
					logBlockedRequests: false,
				},
			}}
		>
			<ConsentDraftProvider>
				<main
					style={{
						padding: '2rem',
						fontFamily: 'system-ui, -apple-system, sans-serif',
						maxWidth: 960,
						margin: '0 auto',
					}}
				>
					<h1 style={{ marginTop: 0 }}>c15t v3 — live test harness</h1>
					<p style={{ color: '#555', lineHeight: 1.5 }}>
						Check/uncheck a category to stage your choice. Click{' '}
						<strong>Save</strong> to commit to the kernel — only then do scripts
						actually load/unload. <strong>Reset</strong> discards the draft.
						This is the "preference center" UX pattern; the banner buttons
						(Accept All / Reject All) commit immediately.
					</p>

					<Suspense fallback={null}>
						<Diagnostics scripts={DEMO_SCRIPTS} />
					</Suspense>
				</main>
				{/* v3 UI components — styled stock surfaces. */}
				<ConsentBanner
					title="We value your privacy (v3 ConsentBanner)"
					description="Click a button below to commit immediately, or Customize to open the preference dialog."
				/>
				<ConsentDialog />
				<ConsentWidget />
			</ConsentDraftProvider>
		</ConsentProvider>
	);
}
