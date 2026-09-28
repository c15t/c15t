<script lang="ts">
	import ConsentManagerProvider from '../../lib/components/manager-provider.svelte';
	import ConsentWidget from '../../lib/components/preferences.svelte';
	import type { ConsentContextValue } from '../../lib/context.svelte';
	import type { ConsentManagerOptions } from '../../lib/types';
	import Reader from './policy-state-reader.svelte';

	let {
		options,
		capture,
		noStyle = false,
	}: {
		options: ConsentManagerOptions;
		capture?: (context: ConsentContextValue) => void;
		noStyle?: boolean;
	} = $props();
</script>

<ConsentManagerProvider {options}>
	{#if capture}<Reader {capture} />{/if}
	<ConsentWidget {noStyle} />
</ConsentManagerProvider>
