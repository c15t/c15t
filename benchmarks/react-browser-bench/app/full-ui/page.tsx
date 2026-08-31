'use client';

import { ConsentDialogTrigger, useConsentManager } from '@c15t/react';

import { BenchmarkProvider } from '../_bench/provider';

const BenchmarkControls = () => {
	const { setActiveUI } = useConsentManager();

	return (
		<button
			id="full-ui-open-preferences"
			onClick={() => setActiveUI('dialog')}
			type="button"
		>
			Open Preferences
		</button>
	);
};

const FullUIPage = () => {
	return (
		<BenchmarkProvider scenario="full-ui">
			<main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
				<h1>React Full UI Benchmark</h1>
				<p>Hosted mode with banner and preferences dialog.</p>
				<BenchmarkControls />
				<ConsentDialogTrigger />
			</main>
		</BenchmarkProvider>
	);
};

export default FullUIPage;
