<script lang="ts">
	import { ConsentBanner, ConsentDialog } from '@c15t/svelte';
	import StorybookConsentProvider from './StorybookConsentProvider.svelte';
	import {
		editableConsentOptions,
		editableStoredConsent,
	} from './storybook-consent-fixtures';

	let {
		open = false,
		withBanner = false,
		useStoredConsent = false,
	}: {
		open?: boolean;
		withBanner?: boolean;
		useStoredConsent?: boolean;
	} = $props();
</script>

<StorybookConsentProvider
	options={editableConsentOptions}
	storedConsent={useStoredConsent ? editableStoredConsent : undefined}
>
	{#if withBanner}
		<ConsentBanner />
	{/if}
	<ConsentDialog {open} />
</StorybookConsentProvider>
