'use client';

import {
	ConsentManagerProvider,
	useConsentManager,
} from '@c15t/react/headless';

export default function HeadlessPage() {
	return (
		<ConsentManagerProvider options={{ mode: 'offline' }}>
			<main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
				<h1>Headless Only Test</h1>
				<p>This page uses headless mode for custom UI implementations.</p>
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
				<li>Analytics: {has('measurement') ? 'yes' : 'no'}</li>
				<li>Marketing: {has('marketing') ? 'yes' : 'no'}</li>
				<li>Functionality: {has('functionality') ? 'yes' : 'no'}</li>
			</ul>

			<h2>Raw Consents</h2>
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
