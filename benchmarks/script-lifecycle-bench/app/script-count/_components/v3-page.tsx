'use client';

import { ConsentDraftProvider } from '@c15t/react/v3/draft';
import { useSaveConsents } from '@c15t/react/v3/hooks';
import { useScriptLoader } from '@c15t/react/v3/module-hooks/script-loader';
import { ConsentProvider } from '@c15t/react/v3/provider';
import { createConsentKernel, createOfflineTransport } from 'c15t/v3';
import { useEffect, useMemo, useRef, useState } from 'react';
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
	const [, setTick] = useState(0);

	if (!benchRef.current) {
		benchRef.current = createInitialBenchState('v3', count);
	}

	useEffect(() => {
		const bench = benchRef.current;
		if (!bench) return;
		window.__c15tScriptCountBench = bench;
		publish(bench, {
			activeUI: 'ready',
			loadedIds: loader
				.getLoadedScriptIds()
				.sort((left, right) => left.localeCompare(right)),
			domIds: listDomIds(count),
			initialReady: true,
		});
	}, [loader, count]);

	useEffect(() => {
		let frame = 0;
		const poll = () => {
			const bench = benchRef.current;
			if (bench) {
				publish(bench, {
					loadedIds: loader
						.getLoadedScriptIds()
						.sort((left, right) => left.localeCompare(right)),
					domIds: listDomIds(count),
				});
				setTick((value) => value + 1);
			}
			frame = window.requestAnimationFrame(poll);
		};
		frame = window.requestAnimationFrame(poll);
		return () => window.cancelAnimationFrame(frame);
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
			<pre id="script-count-state">
				{JSON.stringify(
					typeof window === 'undefined'
						? benchRef.current
						: (window.__c15tScriptCountBench ?? benchRef.current),
					null,
					2
				)}
			</pre>
		</>
	);
}

export function V3ScriptCountPage({ count }: { count: number }) {
	const [kernel] = useState(() =>
		createConsentKernel({
			transport: createOfflineTransport(),
			initialJurisdiction: 'GDPR',
			initialShowConsentBanner: true,
		})
	);

	return (
		<ConsentProvider kernel={kernel}>
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
