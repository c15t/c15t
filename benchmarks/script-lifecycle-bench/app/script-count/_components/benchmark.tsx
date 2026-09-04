'use client';

import { offline } from '@c15t/react';
import { ConsentDraftProvider } from '@c15t/react/draft';
import { useSaveConsents } from '@c15t/react/hooks';
import { useScriptLoader } from '@c15t/react/module-hooks/script-loader';
import { ConsentProvider } from '@c15t/react/provider';
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

const ScriptCountProbe = ({ count }: { count: number }) => {
	const scripts = useMemo(() => makeScripts(count), [count]);
	const loader = useScriptLoader(scripts);
	const saveConsents = useSaveConsents();
	const [bench, setBench] = useState(() => createInitialBenchState(count));
	void setBench;

	useEffect(() => {
		window.__c15tScriptCountBench = bench;
		publish(bench, {
			activeUI: 'ready',
			initialReady: true,
		});

		window.__c15tGetScriptCountBenchState = () => {
			publish(bench, {
				domIds: listDomIds(count),
				loadedIds: loader
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
	}, [bench, loader, count]);

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
					void saveConsents('all');
				}}
				type="button"
			>
				Accept all
			</button>
			<pre id="script-count-state">ready</pre>
		</>
	);
};

export const ScriptCountBenchmark = ({ count }: { count: number }) => (
	<ConsentProvider
		options={{
			mode: offline(),
			persistence: false,
		}}
	>
		<ConsentDraftProvider>
			<main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
				<h1>@c15t/react script count benchmark</h1>
				<p>Scripts: {count}</p>
				<ScriptCountProbe count={count} />
			</main>
		</ConsentDraftProvider>
	</ConsentProvider>
);
