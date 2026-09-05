<script lang="ts">
	import type { Snippet } from 'svelte';

	import { getConsentContext } from '../context.svelte';
	import ConsentButton from './consent-button.svelte';

	const consent = getConsentContext();

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
	data-c15t-rights={consent.snapshot.policyRule.rights.join(' ')}
	{...restProps}
>
	{#if children}
		{@render children()}
	{/if}
</ConsentButton>
