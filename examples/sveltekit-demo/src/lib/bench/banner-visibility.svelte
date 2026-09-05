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
	import { observeBannerVisibility, getBenchState } from './banner-state';
	import BenchmarkBanner from './benchmark-banner.svelte';

	let snapshot = $state<ConsentSnapshot | null>(null);
	let kernel: ConsentKernel | null = null;

	onMount(() => {
		kernel = createConsentKernel({
			transport: createHostedTransport({
				backendURL: '/api/bench-consent',
			}),
		});

		snapshot = kernel.getSnapshot();
		const state = getBenchState();
		if (state && state.mountMs === undefined) {
			state.mountMs = performance.now();
		}

		const unsubscribe = kernel.subscribe((next: ConsentSnapshot) => {
			snapshot = next;
		});

		void (async () => {
			const result = await kernel.commands.init();
			if (!result.ok) {
				const currentState = getBenchState();
				if (!currentState) {
					return;
				}
				currentState.errorCount += 1;
				currentState.errors.push(
					String(result.error ?? 'kernel.commands.init() failed')
				);
			}
		})();

		return () => {
			unsubscribe();
			kernel?.dispose();
			kernel = null;
		};
	});

	$effect(() => {
		const activeUI = snapshot?.activeUI ?? 'none';
		const state = getBenchState();
		if (state) {
			state.renderCount += 1;
			state.activeUI = activeUI;
		}

		return observeBannerVisibility(activeUI);
	});
</script>

<main
	style="padding: 32px; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;"
>
	<h1 style="margin: 0;">Svelte c15t banner benchmark</h1>
</main>

{#if snapshot?.activeUI === 'banner'}
	<BenchmarkBanner
		onAccept={() => void kernel?.commands.save('all')}
		onReject={() => void kernel?.commands.save('none')}
	/>
{/if}
