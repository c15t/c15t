'use client';

import '@c15t/react/styles.css';
import type { AllConsentNames } from '@c15t/core';
import { offline } from '@c15t/react/v3';
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

const CATEGORIES: AllConsentNames[] = [
	'necessary',
	'functionality',
	'marketing',
	'measurement',
	'experience',
];

const TestComponent = () => {
	const consents = useConsents();
	const draft = useConsentDraft();
	const saveConsents = useSaveConsents();
	const hasConsented = useHasConsented();

	return (
		<div>
			<p>Has consented: {String(hasConsented)}</p>
			<div>
				{CATEGORIES.map((category) => (
					<label
						key={category}
						style={{ display: 'block' }}
					>
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
			<button
				onClick={() => saveConsents('all')}
				type="button"
			>
				Accept All
			</button>
		</div>
	);
};
const V3ReactFullSplitPage = () => (
	<ConsentProvider
		options={{
			mode: offline(),
		}}
	>
		<ConsentDraftProvider>
			<main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
				<h1>React v3 Full Split Benchmark</h1>
				<p>This route imports the v3 UI experience from split subpaths.</p>
				<TestComponent />
			</main>
			<ConsentBanner />
			<ConsentDialog />
			<ConsentWidget />
		</ConsentDraftProvider>
	</ConsentProvider>
);

export default V3ReactFullSplitPage;
