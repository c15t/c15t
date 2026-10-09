<script lang="ts">
	import ConsentProvider from '../../lib/components/consent-provider.svelte';
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

<ConsentProvider {options}>
	{#if capture}<Reader {capture} />{/if}
	<ConsentWidget {noStyle} />
</ConsentProvider>
