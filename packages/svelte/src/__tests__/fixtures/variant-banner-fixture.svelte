<script lang="ts">
	import type { PromptPosition, PromptVariant } from '@c15t/core';

	import Banner from '../../lib/components/consent-banner.svelte';
	import Dialog from '../../lib/components/consent-dialog.svelte';
	import Provider from '../../lib/components/consent-manager-provider.svelte';
	import type { ConsentManagerOptions } from '../../lib/types';

	let {
		options,
		variant,
		position,
		blocking,
	}: {
		options: ConsentManagerOptions;
		variant?: PromptVariant;
		position?: PromptPosition;
		blocking?: boolean;
	} = $props();
</script>

<Provider {options}>
	<Banner
		{variant}
		{position}
		{blocking}
	/>
	<Dialog />
</Provider>
