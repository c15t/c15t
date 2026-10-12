<script lang="ts">
	import BenchShell from '$lib/bench-shell.svelte';
	import {
		benchConsentCategories,
		benchNetworkBlocker,
		benchScripts,
	} from '$lib/fixture';
	import ScriptProbe from '$lib/script-probe.svelte';
	import { ConsentRoot } from '@c15t/svelte';

	let { children, data } = $props();
</script>

<ConsentRoot
	state={data.consent}
	consentCategories={[...benchConsentCategories]}
	scripts={benchScripts}
	networkBlocker={benchNetworkBlocker}
	disableAnimation={true}
	trapFocus={false}
>
	<BenchShell scenario="repeat-visitor-scripts">
		<ScriptProbe returning={true} />
		{@render children()}
	</BenchShell>
</ConsentRoot>
