<script lang="ts">
	import { ConsentBanner, ConsentDialog } from '@c15t/svelte';
	import StorybookConsentProvider from './StorybookConsentProvider.svelte';
	import {
		editableConsentOptions,
	} from './storybook-consent-fixtures';

	let { includeDialog = false }: { includeDialog?: boolean } = $props();
</script>

<StorybookConsentProvider options={editableConsentOptions}>
	<ConsentBanner />
	{#if includeDialog}
		<ConsentDialog />
	{/if}
</StorybookConsentProvider>
