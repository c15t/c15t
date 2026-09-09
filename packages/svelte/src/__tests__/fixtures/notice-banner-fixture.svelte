<script lang="ts">
	import Banner from '../../lib/components/consent-banner.svelte';
	import Dialog from '../../lib/components/consent-dialog.svelte';
	import Provider from '../../lib/components/consent-manager-provider.svelte';
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
