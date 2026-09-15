<script lang="ts">
	import Provider from '../../lib/components/manager-provider.svelte';
	import Dialog from '../../lib/components/panel.svelte';
	import Banner from '../../lib/components/prompt.svelte';
	import type { ConsentContextValue } from '../../lib/context.svelte';
	import type { ConsentManagerOptions } from '../../lib/types';
	import Reader from './policy-state-reader.svelte';

	let {
		options,
		capture,
		title,
		description,
		dismissButtonText,
	}: {
		options: ConsentManagerOptions;
		capture: (context: ConsentContextValue) => void;
		title?: string;
		description?: string;
		dismissButtonText?: string;
	} = $props();
</script>

<Provider {options}>
	<Reader {capture} />
	<Banner
		{title}
		{description}
		{dismissButtonText}
	/>
	<Dialog />
</Provider>
