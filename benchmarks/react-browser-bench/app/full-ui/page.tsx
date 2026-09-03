'use client';

import { useSetActiveUI } from '@c15t/react';

import { ReactBenchmarkProvider } from '../_bench/provider';

const BenchmarkControls = () => {
	const setActiveUI = useSetActiveUI();

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

const FullUIPage = () => (
	<ReactBenchmarkProvider scenario="full-ui">
		<main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
			<h1>React Full UI Benchmark</h1>
			<p>Hosted mode with the banner and preferences dialog.</p>
			<BenchmarkControls />
		</main>
	</ReactBenchmarkProvider>
);

export default FullUIPage;
