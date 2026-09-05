'use client';

import type { PolicyBenchFixtureName } from '@c15t/benchmarking/policy-fixtures';
import { useSaveConsents, useSetActiveUI } from '@c15t/react';

import { PolicyBenchmarkProvider } from './policy-provider';
import type { PolicyBenchScenario } from './policy-state';

const Controls = () => {
	const setActiveUI = useSetActiveUI();
	const save = useSaveConsents();
	return (
		<>
			<button
				id="policy-save-partial"
				type="button"
				onClick={() => save({ functionality: true })}
			>
				Save partial choice
			</button>
			<button
				id="policy-open-preferences"
				onClick={() => setActiveUI('dialog')}
				type="button"
			>
				Open Preferences
			</button>
		</>
	);
};

export const PolicyBenchmarkPage = ({
	fixture,
	scenario,
}: {
	fixture: PolicyBenchFixtureName;
	scenario: PolicyBenchScenario;
}) => (
	<PolicyBenchmarkProvider
		fixture={fixture}
		scenario={scenario}
	>
		<main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
			<h1>React Policy Benchmark</h1>
			<p>
				Fixture: {fixture} / Scenario: {scenario}
			</p>
			<Controls />
		</main>
	</PolicyBenchmarkProvider>
);
