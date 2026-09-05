<script lang="ts">
	import BenchShell from '$lib/bench-shell.svelte';
	import { benchConsentCategories } from '$lib/fixture';

	import '@c15t/svelte/styles.css';
	import { ConsentManagerProvider, hosted } from '@c15t/svelte';

	let { children, data } = $props();
</script>

<ConsentManagerProvider
	options={{
		mode: hosted({ url: '/api/c15t' }),
		consentCategories: [...benchConsentCategories],
		prefetch: data.consentPrefetch,
		disableAnimation: true,
		trapFocus: false,
	}}
>
	<BenchShell scenario="ssr-manifest">
		{@render children()}
	</BenchShell>
</ConsentManagerProvider>
