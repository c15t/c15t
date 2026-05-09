<script lang="ts">
	import {
		createConsentKernel,
		createHostedTransport,
		type ConsentKernel,
		type ConsentSnapshot,
	} from '../../../../../packages/core/src/v3';
	import { onMount } from 'svelte';
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
		const state = getBenchState('v3');
		if (state && state.mountMs === undefined) {
			state.mountMs = performance.now();
		}

		const unsubscribe = kernel.subscribe((next: ConsentSnapshot) => {
			snapshot = next;
		});

		void kernel.commands.init().then((result: { ok: boolean; error?: unknown }) => {
			if (!result.ok) {
				const state = getBenchState('v3');
				if (!state) return;
				state.errorCount += 1;
				state.errors.push(
					String(result.error ?? 'kernel.commands.init() failed')
				);
			}
		});

		return () => {
			unsubscribe();
			kernel = null;
		};
	});

	$effect(() => {
		const activeUI = snapshot?.activeUI ?? 'none';
		const state = getBenchState('v3');
		if (state) {
			state.renderCount += 1;
			state.activeUI = activeUI;
		}

		return observeBannerVisibility('v3', activeUI);
	});
</script>

<main style="padding: 32px; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
	<h1 style="margin: 0;">Svelte c15t/v3 banner benchmark</h1>
</main>

{#if snapshot?.activeUI === 'banner'}
	<BenchmarkBanner onAccept={() => void kernel?.commands.save('all')} />
{/if}
