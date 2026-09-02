'use client';

import '@c15t/react/styles.css';
import type { AllConsentNames } from '@c15t/core';
import {
	ConsentBanner,
	ConsentDialog,
	ConsentDraftProvider,
	ConsentProvider,
	offline,
	ConsentWidget,
	useConsentDraft,
	useConsents,
	useHasConsented,
	useSaveConsents,
} from '@c15t/react/v3';

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
const V3ReactFullAggregatePage = () => (
	<ConsentProvider
		options={{
			mode: offline(),
		}}
	>
		<ConsentDraftProvider>
			<main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
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

export default V3ReactFullAggregatePage;
