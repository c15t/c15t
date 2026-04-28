'use client';

import { ConsentManagerProvider, useConsentManager } from '@c15t/react';
import { useEffect, useMemo, useRef } from 'react';
import {
	createInitialBenchState,
	listDomIds,
	makeScripts,
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

function V2Probe({ count }: { count: number }) {
	const consent = useConsentManager();
	const benchRef = useRef<ScriptCountBenchState | null>(null);

	if (!benchRef.current) {
		benchRef.current = createInitialBenchState('v2', count);
	}

	useEffect(() => {
		const bench = benchRef.current;
		if (!bench) return;
		window.__c15tScriptCountBench = bench;
		publish(bench, {
			activeUI: consent.activeUI,
			initialReady: true,
		});

		window.__c15tGetScriptCountBenchState = () => {
			const bench = benchRef.current;
			if (!bench) return null;
			publish(bench, {
				activeUI: consent.activeUI,
				loadedIds: consent
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
	}, [consent, count]);

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
					void consent.saveConsents('all');
				}}
				type="button"
			>
				Accept all
			</button>
			<pre id="script-count-state">ready</pre>
		</>
	);
}

export function V2ScriptCountPage({ count }: { count: number }) {
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
			<main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
				<h1>v2 @c15t/react script count benchmark</h1>
				<p>Scripts: {count}</p>
				<V2Probe count={count} />
			</main>
		</ConsentManagerProvider>
	);
}
