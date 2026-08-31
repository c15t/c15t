'use client';

import { useSetActiveUI } from '@c15t/react/v3';

import { ReactV3BenchmarkProvider } from '../_bench/v3-provider';

const BenchmarkControls = () => {
	const setActiveUI = useSetActiveUI();

	return (
		<button
			id="react-v3-full-open-preferences"
			onClick={() => setActiveUI('dialog')}
			type="button"
		>
			Open Preferences
		</button>
	);
};

const ReactV3FullPage = () => {
	return (
		<ReactV3BenchmarkProvider scenario="react-v3-full">
			<main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
				<h1>React v3 Full UI Benchmark</h1>
				<p>Hosted mode with v3 banner and preferences dialog.</p>
				<BenchmarkControls />
			</main>
		</ReactV3BenchmarkProvider>
	);
};

export default ReactV3FullPage;
