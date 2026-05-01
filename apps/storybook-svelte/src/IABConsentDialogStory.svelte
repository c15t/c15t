<script lang="ts">
	import { IABConsentDialog } from '@c15t/svelte';
	import StorybookIABProvider from './StorybookIABProvider.svelte';

	let { open = true }: { open?: boolean } = $props();
</script>

<StorybookIABProvider>
	<IABConsentDialog {open} />
</StorybookIABProvider>
