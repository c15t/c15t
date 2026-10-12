<script lang="ts">
	import BenchShell from '$lib/bench-shell.svelte';
	import { createBrowserManifestTransport } from '$lib/client-manifest-transport';
	import { benchConsentCategories } from '$lib/fixture';
	import { ConsentProvider, custom } from '@c15t/svelte';

	let { children } = $props();
</script>

<ConsentProvider
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
</ConsentProvider>
