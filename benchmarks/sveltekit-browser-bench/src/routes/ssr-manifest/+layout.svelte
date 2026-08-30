<script lang="ts">
	import BenchmarkProbe from '$lib/benchmark-probe.svelte';

	import '@c15t/svelte/styles.css';
	import {
		ConsentBanner,
		ConsentDialog,
		ConsentManagerProvider,
	} from '@c15t/svelte';

	let { children, data } = $props();
</script>

<ConsentManagerProvider
	options={{
		mode: 'c15t',
		backendURL: '/api/c15t',
		consentCategories: [
			'necessary',
			'functionality',
			'experience',
			'measurement',
			'marketing',
		],
		prefetch: data.consentPrefetch,
		disableAnimation: true,
		trapFocus: false,
	}}
>
	<BenchmarkProbe scenario="ssr-manifest" />
	<ConsentBanner />
	<ConsentDialog />
	{@render children()}
</ConsentManagerProvider>
