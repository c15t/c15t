'use client';

import '@c15t/react/styles.css';

import {
	ConsentBanner,
	ConsentDialog,
	ConsentDraftProvider,
	ConsentProvider,
	ConsentWidget,
	createConsentKernel,
	createOfflineTransport,
	useConsentDraft,
	useConsents,
	useHasConsented,
	useSaveConsents,
} from '@c15t/react/v3';
import type { AllConsentNames } from 'c15t';
import { useState } from 'react';

const CATEGORIES: AllConsentNames[] = [
	'necessary',
	'functionality',
	'marketing',
	'measurement',
	'experience',
];

export default function V3ReactFullAggregatePage() {
	const [kernel] = useState(() =>
		createConsentKernel({
			transport: createOfflineTransport(),
			initialJurisdiction: 'GDPR',
			initialShowConsentBanner: true,
		})
	);

	return (
		<ConsentProvider kernel={kernel}>
			<ConsentDraftProvider>
				<main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
					<h1>React v3 Full Aggregate Benchmark</h1>
					<p>This route imports the v3 UI experience from @c15t/react/v3.</p>
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
