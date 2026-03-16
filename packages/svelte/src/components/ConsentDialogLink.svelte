<script lang="ts">
	import type { Snippet } from 'svelte';
	import ConsentButton from './ConsentButton.svelte';

	let {
		children,
		noStyle = true,
		...restProps
	}: {
		children: Snippet;
		noStyle?: boolean;
		'data-testid'?: string;
		[key: string]: unknown;
	} = $props();
</script>

<ConsentButton
	action="open-consent-dialog"
	{noStyle}
	data-testid="consent-dialog-link"
	{...restProps}
>
	{#if children}
		{@render children()}
	{/if}
</ConsentButton>
