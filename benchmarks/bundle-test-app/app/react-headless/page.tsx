'use client';

import {
	ConsentManagerProvider,
	useConsentManager,
} from '@c15t/react/headless';

export default function ReactHeadlessPage() {
	return (
		<ConsentManagerProvider options={{ mode: 'offline' }}>
			<main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
				<h1>React Headless Benchmark</h1>
				<p>This route measures the tree-shaken headless React runtime.</p>
				<TestComponent />
			</main>
		</ConsentManagerProvider>
	);
}

function TestComponent() {
	const { consents, has, saveConsents } = useConsentManager();
	return (
		<div>
			<h2>Consent Status</h2>
			<ul>
				<li>Measurement: {has('measurement') ? 'yes' : 'no'}</li>
				<li>Marketing: {has('marketing') ? 'yes' : 'no'}</li>
			</ul>
			<pre>{JSON.stringify(consents, null, 2)}</pre>
			<div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
				<button onClick={() => saveConsents('all')}>Accept All</button>
				<button onClick={() => saveConsents('necessary')}>
					Necessary Only
				</button>
			</div>
		</div>
	);
}
