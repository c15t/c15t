'use client';

import { offline } from '@c15t/react';
import {
	useConsent,
	useEffectivePermissions,
	useSaveConsents,
} from '@c15t/react/hooks';
import { ConsentProvider } from '@c15t/react/provider';

const TestComponent = () => {
	const consents = useEffectivePermissions();
	const hasMeasurement = useConsent('measurement');
	const hasMarketing = useConsent('marketing');
	const saveConsents = useSaveConsents();
	return (
		<div>
			<h2>Consent Status</h2>
			<ul>
				<li>Measurement: {hasMeasurement ? 'yes' : 'no'}</li>
				<li>Marketing: {hasMarketing ? 'yes' : 'no'}</li>
			</ul>
			<pre>{JSON.stringify(consents, null, 2)}</pre>
			<div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
				<button
					type="button"
					onClick={() => saveConsents('all')}
				>
					Accept All
				</button>
				<button
					type="button"
					onClick={() => saveConsents('none')}
				>
					Necessary Only
				</button>
			</div>
		</div>
	);
};
const ReactHeadlessPage = () => (
	<ConsentProvider options={{ mode: offline() }}>
		<main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
			<h1>React Headless Benchmark</h1>
			<p>This route measures the tree-shaken headless React runtime.</p>
			<TestComponent />
		</main>
	</ConsentProvider>
);

export default ReactHeadlessPage;
