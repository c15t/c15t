<script lang="ts">
	import BenchShell from '$lib/bench-shell.svelte';
	import { benchConsentCategories } from '$lib/fixture';
	import { ConsentRoot } from '@c15t/svelte';

	let { children, data } = $props();
</script>

<ConsentRoot
	state={data.consent}
	consentCategories={[...benchConsentCategories]}
	disableAnimation={true}
	trapFocus={false}
>
	<BenchShell scenario="repeat-visitor">
		{@render children()}
	</BenchShell>
</ConsentRoot>
