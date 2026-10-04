<script lang="ts">
	import BenchShell from '$lib/bench-shell.svelte';
	import {
		benchConsentCategories,
		benchNetworkBlocker,
		benchScripts,
	} from '$lib/fixture';
	import ScriptProbe from '$lib/script-probe.svelte';

	import '@c15t/svelte/styles.css';
	import { ConsentManagerProvider, hosted } from '@c15t/svelte';

	let { children, data } = $props();
</script>

<ConsentManagerProvider
	options={{
		mode: hosted({ url: '/api/c15t' }),
		consentCategories: [...benchConsentCategories],
		prefetch: data.consentPrefetch,
		scripts: benchScripts,
		networkBlocker: benchNetworkBlocker,
		disableAnimation: true,
		trapFocus: false,
	}}
>
	<BenchShell scenario="scripts">
		<ScriptProbe returning={false} />
		{@render children()}
	</BenchShell>
</ConsentManagerProvider>
