<script lang="ts">
	import { IABConsentBanner, IABConsentDialog } from '@c15t/svelte';
	import StorybookIABProvider from './StorybookIABProvider.svelte';

	let { includeDialog = false }: { includeDialog?: boolean } = $props();
</script>

<StorybookIABProvider>
	<IABConsentBanner />
	{#if includeDialog}
		<IABConsentDialog />
	{/if}
</StorybookIABProvider>
