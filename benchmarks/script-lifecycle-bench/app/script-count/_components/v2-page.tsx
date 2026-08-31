'use client';

import { ConsentManagerProvider, useConsentManager } from '@c15t/react';
import { useEffect, useMemo, useState } from 'react';

import { createInitialBenchState, listDomIds, makeScripts } from './fixtures';
import type { ScriptCountBenchState } from './fixtures';

const publish = function publish(
	state: ScriptCountBenchState,
	patch: Partial<Omit<ScriptCountBenchState, 'recordScriptExecution'>>
) {
	Object.assign(state, patch);
	window.__c15tScriptCountBench = state;
	(
		window as unknown as { __c15tScriptBench?: ScriptCountBenchState }
	).__c15tScriptBench = state;
};

const V2Probe = ({ count }: { count: number }) => {
	const consent = useConsentManager();
	const [bench, setBench] = useState(() =>
		createInitialBenchState('v2', count)
	);
	void setBench;

	useEffect(() => {
		window.__c15tScriptCountBench = bench;
		publish(bench, {
			activeUI: consent.activeUI,
			initialReady: true,
		});

		window.__c15tGetScriptCountBenchState = () => {
			publish(bench, {
				activeUI: consent.activeUI,
				domIds: listDomIds(count),
				loadedIds: consent
					.getLoadedScriptIds()
					.sort((left, right) => left.localeCompare(right)),
			});
			return bench;
		};

		return () => {
			if (window.__c15tGetScriptCountBenchState) {
				delete window.__c15tGetScriptCountBenchState;
			}
		};
	}, [bench, consent, count]);

	return (
		<>
			<button
				id="run-script-count"
				onClick={() => {
					publish(bench, {
						actionStartedAtMs: performance.now(),
						complete: false,
						completedAtMs: null,
					});
					void consent.saveConsents('all');
				}}
				type="button"
			>
				Accept all
			</button>
			<pre id="script-count-state">ready</pre>
		</>
	);
};

export const V2ScriptCountPage = ({ count }: { count: number }) => {
	const scripts = useMemo(() => makeScripts(count), [count]);

	return (
		<ConsentManagerProvider
			options={{
				mode: 'offline',
				store: {
					reloadOnConsentRevoked: false,
					scripts,
				},
			}}
		>
			<main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
				<h1>v2 @c15t/react script count benchmark</h1>
				<p>Scripts: {count}</p>
				<V2Probe count={count} />
			</main>
		</ConsentManagerProvider>
	);
};
