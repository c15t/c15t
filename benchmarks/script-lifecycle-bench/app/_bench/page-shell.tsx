'use client';

import Link from 'next/link';

import { allScenarioConfigs } from './fixtures';
import type { ScriptLifecycleScenarioConfig } from './fixtures';
import { useScriptLifecycleBench } from './provider';

export const ScriptLifecyclePageShell = ({
	config,
}: {
	config: ScriptLifecycleScenarioConfig;
}) => {
	const { ready, runScenarioAction, state } = useScriptLifecycleBench();

	return (
		<main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
			<h1>c15t Script Lifecycle Benchmark</h1>
			<p>Scenario: {config.name}</p>
			<p>Ready: {ready ? 'yes' : 'no'}</p>
			<div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
				{allScenarioConfigs.map((scenario) => (
					<Link
						key={scenario.name}
						href={`/?scenario=${scenario.name}`}
					>
						{scenario.name}
					</Link>
				))}
			</div>
			<div style={{ marginTop: '1rem' }}>
				<button
					id="run-scenario-action"
					onClick={() => {
						void runScenarioAction();
					}}
					type="button"
				>
					{config.actionLabel}
				</button>
			</div>
			<pre
				id="script-bench-state"
				style={{
					background: '#f5f5f5',
					borderRadius: '0.5rem',
					marginTop: '1rem',
					overflowX: 'auto',
					padding: '1rem',
				}}
			>
				{JSON.stringify(state, null, 2)}
			</pre>
		</main>
	);
};
