<script lang="ts">
	import { onMount } from 'svelte';

	import {
		createConsentKernel,
		createHostedTransport,
	} from '../../../../../packages/core/src';
	import type {
		ConsentKernel,
		ConsentSnapshot,
	} from '../../../../../packages/core/src';
	import { createScriptLoader } from '../../../../../packages/core/src/modules/script-loader';
	import type { ScriptLoaderHandle } from '../../../../../packages/core/src/modules/script-loader';
	import {
		createInitialBenchState,
		listDomIds,
		makeScripts,
		publishScriptBenchState,
	} from './script-count-state';
	import type { ScriptCountBenchState } from './script-count-state';

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
			emitToV2DebugListeners: false,
			kernel,
			scripts: makeScripts(count),
		});
		benchState = createInitialBenchState(count);
		activeUI = kernel.getSnapshot().activeUI ?? 'none';
		publishScriptBenchState(benchState, { activeUI });

		window.__c15tGetScriptCountBenchState = () => {
			if (!benchState) {
				return null;
			}
			publishScriptBenchState(benchState, {
				activeUI,
				domIds: listDomIds(count),
				loadedIds: [...(loader?.getLoadedScriptIds() ?? [])].sort(
					(left: string, right: string) => left.localeCompare(right)
				),
			});
			return benchState;
		};

		const unsubscribe = kernel.subscribe((snapshot: ConsentSnapshot) => {
			activeUI = snapshot.activeUI ?? 'none';
			if (!benchState) {
				return;
			}
			publishScriptBenchState(benchState, { activeUI });
		});

		void (async () => {
			const result = await kernel.commands.init();
			if (!benchState) {
				return;
			}
			if (!result.ok) {
				benchState.errors.push(
					String(result.error ?? 'kernel.commands.init() failed')
				);
			}
			publishScriptBenchState(benchState, {
				activeUI: kernel?.getSnapshot().activeUI ?? activeUI,
				initialReady: result.ok,
			});
		})();

		return () => {
			unsubscribe();
			loader?.dispose();
			loader = null;
			kernel?.dispose();
			kernel = null;
			delete window.__c15tGetScriptCountBenchState;
		};
	});

	const run = function run() {
		if (!benchState || !kernel) {
			return;
		}
		publishScriptBenchState(benchState, {
			actionStartedAtMs: performance.now(),
			complete: false,
			completedAtMs: null,
		});
		void kernel.commands.save('all');
	};
</script>

<main
	style="padding: 32px; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;"
>
	<h1 style="margin: 0 0 8px;">Svelte c15t script benchmark</h1>
	<p style="margin: 0 0 16px;">Scripts: {count}</p>
	<button
		id="run-script-count"
		onclick={run}
		type="button"
	>
		Accept all
	</button>
</main>
