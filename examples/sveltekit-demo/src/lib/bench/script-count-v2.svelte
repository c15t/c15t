<script lang="ts">
	import type { ConsentStoreState } from 'c15t';
	import { clearConsentRuntimeCache, getOrCreateConsentRuntime } from 'c15t';
	import { onMount } from 'svelte';

	import {
		createInitialBenchState,
		listDomIds,
		makeScripts,
		publishScriptBenchState,
	} from './script-count-state';
	import type { ScriptCountBenchState } from './script-count-state';

	let { count }: { count: number } = $props();

	let consentState = $state<ConsentStoreState | null>(null);
	let benchState: ScriptCountBenchState | null = null;

	onMount(() => {
		const runtime = getOrCreateConsentRuntime(
			{
				backendURL: '/api/bench-consent',
				callbacks: {
					onError({ error }) {
						if (!benchState) {
							return;
						}
						benchState.errors.push(String(error));
					},
				},
				mode: 'hosted',
				scripts: makeScripts(count),
				storageConfig: {
					storageKey: `svelte-bench-scripts-v2-${count}`,
				},
			},
			{ pkg: '@c15t/svelte-bench', version: '0.0.0' }
		);

		consentState = runtime.consentStore.getState();
		benchState = createInitialBenchState('v2', count);
		publishScriptBenchState(benchState, {
			activeUI: consentState.activeUI,
		});

		window.__c15tGetScriptCountBenchState = () => {
			if (!benchState || !consentState) {
				return null;
			}
			publishScriptBenchState(benchState, {
				activeUI: consentState.activeUI,
				domIds: listDomIds(count),
				loadedIds: consentState
					.getLoadedScriptIds()
					.sort((left, right) => left.localeCompare(right)),
			});
			return benchState;
		};

		const unsubscribe = runtime.consentStore.subscribe((next) => {
			consentState = next;
			if (!benchState) {
				return;
			}
			publishScriptBenchState(benchState, {
				activeUI: next.activeUI,
				initialReady: !next.isLoadingConsentInfo && next.hasFetchedBanner,
			});
		});

		return () => {
			unsubscribe();
			delete window.__c15tGetScriptCountBenchState;
			clearConsentRuntimeCache();
		};
	});

	const run = function run() {
		if (!benchState || !consentState) {
			return;
		}
		publishScriptBenchState(benchState, {
			actionStartedAtMs: performance.now(),
			complete: false,
			completedAtMs: null,
		});
		void consentState.saveConsents('all');
	};
</script>

<main
	style="padding: 32px; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;"
>
	<h1 style="margin: 0 0 8px;">Svelte current API script benchmark</h1>
	<p style="margin: 0 0 16px;">Scripts: {count}</p>
	<button
		id="run-script-count"
		onclick={run}
		type="button"
	>
		Accept all
	</button>
</main>
