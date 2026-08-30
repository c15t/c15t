<script lang="ts">
	import { ConsentBanner, ConsentDialog } from '@c15t/svelte';
	import StorybookConsentProvider from './StorybookConsentProvider.svelte';
	import {
		editableConsentOptions,
		editableStoredConsent,
	} from './storybook-consent-fixtures';

	let {
		open = undefined,
		trapFocus = false,
		withBanner = false,
		useStoredConsent = false,
	}: {
		open?: boolean;
		trapFocus?: boolean;
		withBanner?: boolean;
		useStoredConsent?: boolean;
	} = $props();
</script>

<StorybookConsentProvider
	options={{ ...editableConsentOptions, trapFocus }}
	storedConsent={useStoredConsent ? editableStoredConsent : undefined}
>
	{#if withBanner}
		<ConsentBanner {trapFocus} />
	{/if}
	<ConsentDialog
		{open}
		{trapFocus}
	/>
</StorybookConsentProvider>
