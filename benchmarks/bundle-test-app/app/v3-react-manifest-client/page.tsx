'use client';

import '@c15t/react/styles.css';
import { createManifestTransport } from '@c15t/core/v3';
import type { Script } from '@c15t/core/v3/modules/script-loader';
import {
	ConsentBanner,
	ConsentDialog,
	ConsentDraftProvider,
	ConsentProvider,
	ConsentWidget,
} from '@c15t/react/v3';
import { lazy, Suspense, useMemo } from 'react';

const Diagnostics = lazy(() => import('../v3-react-full/diagnostics'));

const DEMO_SCRIPTS: Script[] = [
	{
		async: true,
		category: 'measurement',
		id: 'gtm',
		src: 'https://www.googletagmanager.com/gtm.js?id=GTM-DEMO',
	},
	{
		async: true,
		category: 'measurement',
		id: 'ga',
		src: 'https://www.google-analytics.com/analytics.js',
	},
	{
		async: true,
		category: 'measurement',
		id: 'hotjar',
		src: 'https://static.hotjar.com/c/hotjar.js',
	},
	{
		async: true,
		category: 'marketing',
		id: 'fb-pixel',
		src: 'https://connect.facebook.net/en_US/fbevents.js',
	},
	{
		async: true,
		category: 'marketing',
		id: 'fb-sdk',
		src: 'https://connect.facebook.net/en_US/sdk.js',
	},
	{
		async: true,
		category: 'marketing',
		id: 'linkedin-insight',
		src: 'https://snap.licdn.com/li.lms-analytics/insight.min.js',
	},
	{
		async: true,
		category: 'functionality',
		id: 'intercom',
		src: 'https://widget.intercom.io/widget.js',
	},
];

const V3ReactManifestClientPage = () => {
	const transport = useMemo(
		() =>
			createManifestTransport({
				backendURL: '/api/bench-consent',
				manifestURL: '/api/c15t/manifest',
			}),
		[]
	);

	return (
		<ConsentProvider
			options={{
				mode: 'offline',
				networkBlocker: {
					logBlockedRequests: false,
					rules: [
						{ category: 'measurement', domain: 'google-analytics.com' },
						{ category: 'marketing', domain: 'facebook.net' },
						{ category: 'measurement', domain: 'hotjar.com' },
					],
				},
				scripts: DEMO_SCRIPTS,
				transport,
			}}
		>
			<ConsentDraftProvider>
				<main
					style={{
						fontFamily: 'system-ui, -apple-system, sans-serif',
						margin: '0 auto',
						maxWidth: 960,
						padding: '2rem',
					}}
				>
					<h1 style={{ marginTop: 0 }}>c15t v3 — live test harness</h1>
					<p style={{ color: '#555', lineHeight: 1.5 }}>
						Check/uncheck a category to stage your choice. Click{' '}
						<strong>Save</strong> to commit to the kernel — only then do scripts
						actually load/unload. <strong>Reset</strong> discards the draft.
						This is the &quot;preference center&quot; UX pattern; the banner
						buttons (Accept All / Reject All) commit immediately.
					</p>

					<Suspense fallback={null}>
						<Diagnostics scripts={DEMO_SCRIPTS} />
					</Suspense>
				</main>
				<ConsentBanner
					title="We value your privacy (v3 ConsentBanner)"
					description="Click a button below to commit immediately, or Customize to open the preference dialog."
				/>
				<ConsentDialog />
				<ConsentWidget />
			</ConsentDraftProvider>
		</ConsentProvider>
	);
};

export default V3ReactManifestClientPage;
