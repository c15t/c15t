'use client';

import { ConsentDraftProvider } from '@c15t/react/v3/draft';
import { useSaveConsents } from '@c15t/react/v3/hooks';
import { useScriptLoader } from '@c15t/react/v3/module-hooks/script-loader';
import { ConsentProvider } from '@c15t/react/v3/provider';
import { useEffect, useMemo, useState } from 'react';

import { createInitialBenchState, listDomIds, makeV3Scripts } from './fixtures';
import type { ScriptCountBenchState } from './fixtures';

function publish(
	state: ScriptCountBenchState,
	patch: Partial<Omit<ScriptCountBenchState, 'recordScriptExecution'>>
) {
	Object.assign(state, patch);
	window.__c15tScriptCountBench = state;
	(
		window as unknown as { __c15tScriptBench?: ScriptCountBenchState }
	).__c15tScriptBench = state;
}

const V3Probe = ({ count }: { count: number }) => {
	const scripts = useMemo(() => makeV3Scripts(count), [count]);
	const loader = useScriptLoader(scripts);
	const saveConsents = useSaveConsents();
	const [bench, setBench] = useState(() =>
		createInitialBenchState('v3', count)
	);
	void setBench;

	useEffect(() => {
		window.__c15tScriptCountBench = bench;
		publish(bench, {
			activeUI: 'ready',
			initialReady: true,
		});

		window.__c15tGetScriptCountBenchState = () => {
			publish(bench, {
				loadedIds: loader
					.getLoadedScriptIds()
					.sort((left, right) => left.localeCompare(right)),
				domIds: listDomIds(count),
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
						completedAtMs: null,
						complete: false,
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

export const V3ScriptCountPage = ({ count }: { count: number }) => {
	return (
		<ConsentProvider
			options={{
				mode: 'offline',
				persistence: false,
			}}
		>
			<ConsentDraftProvider>
				<main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
					<h1>v3 @c15t/react/v3 script count benchmark</h1>
					<p>Scripts: {count}</p>
					<V3Probe count={count} />
				</main>
			</ConsentDraftProvider>
		</ConsentProvider>
	);
};
