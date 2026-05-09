<script lang="ts">
import type { Snippet } from 'svelte';
import type { ConsentProviderOptions } from '../types';
import ConsentProvider from './consent-provider.svelte';

let {
	children,
	options = {},
}: {
	children?: Snippet;
	options?: ConsentProviderOptions;
} = $props();
</script>

<ConsentProvider {options}>
	{#if children}
		{@render children()}
	{/if}
</ConsentProvider>
