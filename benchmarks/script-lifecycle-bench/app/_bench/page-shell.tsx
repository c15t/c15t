'use client';

import Link from 'next/link';
import {
	allScenarioConfigs,
	type ScriptLifecycleScenarioConfig,
} from './fixtures';
import { useScriptLifecycleBench } from './provider';

export function ScriptLifecyclePageShell({
	config,
}: {
	config: ScriptLifecycleScenarioConfig;
}) {
	const { ready, runScenarioAction, state } = useScriptLifecycleBench();

	return (
		<main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
			<h1>c15t Script Lifecycle Benchmark</h1>
			<p>Scenario: {config.name}</p>
			<p>Ready: {ready ? 'yes' : 'no'}</p>
			<div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
				{allScenarioConfigs.map((scenario) => (
					<Link key={scenario.name} href={`/?scenario=${scenario.name}`}>
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
					marginTop: '1rem',
					padding: '1rem',
					background: '#f5f5f5',
					borderRadius: '0.5rem',
					overflowX: 'auto',
				}}
			>
				{JSON.stringify(state, null, 2)}
			</pre>
		</main>
	);
}
