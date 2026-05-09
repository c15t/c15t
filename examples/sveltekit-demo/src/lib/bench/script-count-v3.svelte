<script lang="ts">
	import {
		createConsentKernel,
		createHostedTransport,
		type ConsentKernel,
		type ConsentSnapshot,
	} from '../../../../../packages/core/src/v3';
	import {
		createScriptLoader,
		type ScriptLoaderHandle,
	} from '../../../../../packages/core/src/v3/modules/script-loader';
	import { onMount } from 'svelte';
	import {
		createInitialBenchState,
		listDomIds,
		makeV3Scripts,
		publishScriptBenchState,
		type ScriptCountBenchState,
	} from './script-count-state';

	let { count }: { count: number } = $props();

	let kernel: ConsentKernel | null = null;
	let loader: ScriptLoaderHandle | null = null;
	let benchState: ScriptCountBenchState | null = null;
	let activeUI = $state('unknown');

	onMount(() => {
		kernel = createConsentKernel({
			transport: createHostedTransport({
				backendURL: '/api/bench-consent',
			}),
		});
		loader = createScriptLoader({
			kernel,
			scripts: makeV3Scripts(count),
			emitToV2DebugListeners: false,
		});
		benchState = createInitialBenchState('v3', count);
		activeUI = kernel.getSnapshot().activeUI ?? 'none';
		publishScriptBenchState(benchState, { activeUI });

		window.__c15tGetScriptCountBenchState = () => {
			if (!benchState) return null;
			publishScriptBenchState(benchState, {
				activeUI,
				loadedIds: [...(loader?.getLoadedScriptIds() ?? [])].sort(
					(left: string, right: string) => left.localeCompare(right)
				),
				domIds: listDomIds(count),
			});
			return benchState;
		};

		const unsubscribe = kernel.subscribe((snapshot: ConsentSnapshot) => {
			activeUI = snapshot.activeUI ?? 'none';
			if (!benchState) return;
			publishScriptBenchState(benchState, { activeUI });
		});

		void kernel.commands.init().then((result: { ok: boolean; error?: unknown }) => {
			if (!benchState) return;
			if (!result.ok) {
				benchState.errors.push(
					String(result.error ?? 'kernel.commands.init() failed')
				);
			}
			publishScriptBenchState(benchState, {
				activeUI: kernel?.getSnapshot().activeUI ?? activeUI,
				initialReady: result.ok,
			});
		});

		return () => {
			unsubscribe();
			loader?.dispose();
			loader = null;
			kernel = null;
			delete window.__c15tGetScriptCountBenchState;
		};
	});

	function run() {
		if (!benchState || !kernel) return;
		publishScriptBenchState(benchState, {
			actionStartedAtMs: performance.now(),
			completedAtMs: null,
			complete: false,
		});
		void kernel.commands.save('all');
	}
</script>

<main style="padding: 32px; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
	<h1 style="margin: 0 0 8px;">Svelte c15t/v3 script benchmark</h1>
	<p style="margin: 0 0 16px;">Scripts: {count}</p>
	<button id="run-script-count" onclick={run} type="button">
		Accept all
	</button>
</main>
