<script lang="ts">
	import type { ConsentStoreState } from 'c15t';
	import {
		clearConsentRuntimeCache,
		getOrCreateConsentRuntime,
	} from 'c15t';
	import { onMount } from 'svelte';
	import { observeBannerVisibility, getBenchState } from './banner-state';
	import BenchmarkBanner from './benchmark-banner.svelte';

	let consentState = $state<ConsentStoreState | null>(null);

	onMount(() => {
		const runtime = getOrCreateConsentRuntime(
			{
				mode: 'hosted',
				backendURL: '/api/bench-consent',
				storageConfig: {
					storageKey: 'svelte-bench-banner-v2',
				},
				callbacks: {
					onError({ error }) {
						const state = getBenchState('v2');
						if (!state) return;
						state.errorCount += 1;
						state.errors.push(String(error));
					},
				},
			},
			{ pkg: '@c15t/svelte-bench', version: '0.0.0' }
		);

		consentState = runtime.consentStore.getState();
		const state = getBenchState('v2');
		if (state && state.mountMs === undefined) {
			state.mountMs = performance.now();
		}

		const unsubscribe = runtime.consentStore.subscribe((next) => {
			consentState = next;
		});

		return () => {
			unsubscribe();
			clearConsentRuntimeCache();
		};
	});

	$effect(() => {
		const activeUI = consentState?.activeUI ?? 'none';
		const state = getBenchState('v2');
		if (state) {
			state.renderCount += 1;
			state.activeUI = activeUI;
		}

		return observeBannerVisibility('v2', activeUI);
	});
</script>

<main style="padding: 32px; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
	<h1 style="margin: 0;">Svelte current API banner benchmark</h1>
</main>

{#if consentState?.activeUI === 'banner'}
	<BenchmarkBanner onAccept={() => void consentState?.saveConsents('all')} />
{/if}

