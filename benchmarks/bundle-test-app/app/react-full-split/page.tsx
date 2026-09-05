'use client';

import '@c15t/react/styles.css';
import type { AllConsentNames } from '@c15t/core';
import { offline } from '@c15t/react';
import { ConsentBanner } from '@c15t/react/consent-banner';
import { ConsentDialog } from '@c15t/react/consent-dialog';
import { ConsentWidget } from '@c15t/react/consent-widget';
import { ConsentDraftProvider, useConsentDraft } from '@c15t/react/draft';
import {
	useEffectivePermissions,
	useExplicitChoice,
	useSaveConsents,
} from '@c15t/react/hooks';
import { ConsentProvider } from '@c15t/react/provider';

const CATEGORIES: AllConsentNames[] = [
	'necessary',
	'functionality',
	'marketing',
	'measurement',
	'experience',
];

const TestComponent = () => {
	const consents = useEffectivePermissions();
	const draft = useConsentDraft();
	const saveConsents = useSaveConsents();
	const hasStoredChoice = Boolean(useExplicitChoice());

	return (
		<div>
			<p>Has stored choice: {String(hasStoredChoice)}</p>
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
const ReactFullSplitPage = () => (
	<ConsentProvider
		options={{
			mode: offline(),
		}}
	>
		<ConsentDraftProvider>
			<main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
				<h1>React Full Split Benchmark</h1>
				<p>This route imports the UI experience from split subpaths.</p>
				<TestComponent />
			</main>
			<ConsentBanner />
			<ConsentDialog />
			<ConsentWidget />
		</ConsentDraftProvider>
	</ConsentProvider>
);

export default ReactFullSplitPage;
