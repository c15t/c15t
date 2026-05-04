'use client';

import '@c15t/react/styles.css';

import { ConsentBanner } from '@c15t/react/v3/consent-banner';
import { ConsentDialog } from '@c15t/react/v3/consent-dialog';
import { ConsentWidget } from '@c15t/react/v3/consent-widget';
import { ConsentDraftProvider, useConsentDraft } from '@c15t/react/v3/draft';
import {
	useConsents,
	useHasConsented,
	useSaveConsents,
} from '@c15t/react/v3/hooks';
import { ConsentProvider } from '@c15t/react/v3/provider';
import type { AllConsentNames } from 'c15t';
import type { Script } from 'c15t/v3/modules/script-loader';

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
		id: 'fb-pixel',
		src: 'https://connect.facebook.net/en_US/fbevents.js',
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

const CATEGORIES: AllConsentNames[] = [
	'necessary',
	'functionality',
	'marketing',
	'measurement',
	'experience',
];

export default function V3ReactStandardScriptLoaderPage() {
	return (
		<ConsentProvider
			options={{
				mode: 'offline',
				scripts: DEMO_SCRIPTS,
				prefetch: {
					initialJurisdiction: 'GDPR',
					initialShowConsentBanner: true,
				},
			}}
		>
			<ConsentDraftProvider>
				<main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
					<h1>React v3 Standard + Script Loader Benchmark</h1>
					<p>
						This route measures the standard v3 UI, persistence, and
						script-loader runtime, without network or iframe blockers.
					</p>
					<TestComponent />
				</main>
				<ConsentBanner />
				<ConsentDialog />
				<ConsentWidget />
			</ConsentDraftProvider>
		</ConsentProvider>
	);
}

function TestComponent() {
	const consents = useConsents();
	const draft = useConsentDraft();
	const saveConsents = useSaveConsents();
	const hasConsented = useHasConsented();

	return (
		<div>
			<p>Has consented: {String(hasConsented)}</p>
			<div>
				{CATEGORIES.map((category) => (
					<label key={category} style={{ display: 'block' }}>
						<input
							checked={draft.values[category]}
							disabled={category === 'necessary'}
							onChange={(event) => draft.set(category, event.target.checked)}
							type="checkbox"
						/>
						{category}
					</label>
				))}
			</div>
			<pre>{JSON.stringify(consents, null, 2)}</pre>
			<button onClick={() => saveConsents('all')} type="button">
				Accept All
			</button>
		</div>
	);
}
