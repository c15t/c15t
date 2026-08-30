<script lang="ts">
	import { ConsentBanner, ConsentDialog } from '@c15t/svelte';
	import StorybookConsentProvider from './StorybookConsentProvider.svelte';
	import { editableConsentOptions } from './storybook-consent-fixtures';

	let {
		includeDialog = false,
		trapFocus = undefined,
	}: { includeDialog?: boolean; trapFocus?: boolean } = $props();
</script>

<StorybookConsentProvider options={{ ...editableConsentOptions, trapFocus }}>
	<ConsentBanner {trapFocus} />
	{#if includeDialog}
		<ConsentDialog {trapFocus} />
	{/if}
</StorybookConsentProvider>
