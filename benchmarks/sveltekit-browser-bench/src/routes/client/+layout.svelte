<script lang="ts">
	import BenchShell from '$lib/bench-shell.svelte';
	import { benchConsentCategories } from '$lib/fixture';
	import { ConsentProvider, hosted } from '@c15t/svelte';

	let { children } = $props();
</script>

<ConsentProvider
	options={{
		mode: hosted({ backendURL: '/api/bench-consent' }),
		consentCategories: [...benchConsentCategories],
		disableAnimation: true,
		trapFocus: false,
	}}
>
	<BenchShell scenario="client">
		{@render children()}
	</BenchShell>
</ConsentProvider>
