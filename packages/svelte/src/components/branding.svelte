<script lang="ts">
import { getConsentContext } from '../context.svelte';
import C15TIcon from './icons/c15-t-icon.svelte';
import ConsentIconOnly from './icons/consent-icon-only.svelte';

let {
	hideBranding = false,
	noStyle = false,
	class: className,
	iconClass,
}: {
	hideBranding?: boolean;
	noStyle?: boolean;
	class?: string;
	iconClass?: { consent?: string; c15t?: string };
} = $props();

const consent = getConsentContext();

const branding = $derived(consent.state.branding);
const showBranding = $derived(!hideBranding && branding !== 'none');
const brandingHref = $derived.by(() => {
	const hostname =
		typeof window !== 'undefined' ? window.location.hostname : '';
	const refParam = `?ref=${encodeURIComponent(hostname)}`;
	return branding === 'consent'
		? `https://consent.io${refParam}`
		: `https://c15t.com${refParam}`;
});
</script>

{#if showBranding}
	<a
		dir="ltr"
		class={noStyle ? '' : className || ''}
		href={brandingHref}
		target="_blank"
		rel="noopener noreferrer"
	>
		Secured by
		{#if branding === 'consent'}
			<ConsentIconOnly class={iconClass?.consent || ''} />
		{:else}
			<C15TIcon class={iconClass?.c15t || ''} />
		{/if}
	</a>
{/if}
