<script lang="ts">
	import BenchShell from '$lib/bench-shell.svelte';
	import { createBrowserManifestTransport } from '$lib/client-manifest-transport';
	import { benchConsentCategories } from '$lib/fixture';

	import '@c15t/svelte/styles.css';
	import { ConsentManagerProvider, custom } from '@c15t/svelte';

	let { children } = $props();
</script>

<ConsentManagerProvider
	options={{
		mode: custom(createBrowserManifestTransport()),
		consentCategories: [...benchConsentCategories],
		disableAnimation: true,
		trapFocus: false,
	}}
>
	<BenchShell scenario="client-manifest">
		{@render children()}
	</BenchShell>
</ConsentManagerProvider>
