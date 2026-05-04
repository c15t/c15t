'use client';

import { ConsentDraftProvider } from '@c15t/react/v3/draft';
import { useSaveConsents } from '@c15t/react/v3/hooks';
import { useScriptLoader } from '@c15t/react/v3/module-hooks/script-loader';
import { ConsentProvider } from '@c15t/react/v3/provider';
import { useEffect, useMemo, useRef } from 'react';
import {
	createInitialBenchState,
	listDomIds,
	makeV3Scripts,
	type ScriptCountBenchState,
} from './fixtures';

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

function V3Probe({ count }: { count: number }) {
	const scripts = useMemo(() => makeV3Scripts(count), [count]);
	const loader = useScriptLoader(scripts);
	const saveConsents = useSaveConsents();
	const benchRef = useRef<ScriptCountBenchState | null>(null);

	if (!benchRef.current) {
		benchRef.current = createInitialBenchState('v3', count);
	}

	useEffect(() => {
		const bench = benchRef.current;
		if (!bench) return;
		window.__c15tScriptCountBench = bench;
		publish(bench, {
			activeUI: 'ready',
			initialReady: true,
		});

		window.__c15tGetScriptCountBenchState = () => {
			const bench = benchRef.current;
			if (!bench) return null;
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
	}, [loader, count]);

	return (
		<>
			<button
				id="run-script-count"
				onClick={() => {
					const bench = benchRef.current;
					if (bench) {
						publish(bench, {
							actionStartedAtMs: performance.now(),
							completedAtMs: null,
							complete: false,
						});
					}
					void saveConsents('all');
				}}
				type="button"
			>
				Accept all
			</button>
			<pre id="script-count-state">ready</pre>
		</>
	);
}

export function V3ScriptCountPage({ count }: { count: number }) {
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
}
