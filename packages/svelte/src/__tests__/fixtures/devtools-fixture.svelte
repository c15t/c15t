<script lang="ts">
	import ConsentManagerProvider from '../../lib/components/consent-manager-provider.svelte';
	import ConsentDevToolsComponent from '../../lib/devtools';
	import { offline } from '../../lib/transports/offline';

	let {
		categories,
		getConsentCategories,
		multiple = false,
		position = 'top-left',
	}: {
		categories?: import('@c15t/core').AllConsentNames[];
		getConsentCategories?: import('../../lib/devtools-options').ConsentDevToolsProps['getConsentCategories'];
		multiple?: boolean;
		position?: import('../../lib/devtools-options').ConsentDevToolsProps['position'];
	} = $props();
</script>

<ConsentManagerProvider
	options={{ mode: offline(), consentCategories: categories }}
>
	<ConsentDevToolsComponent
		{position}
		{getConsentCategories}
		defaultOpen
	/>
</ConsentManagerProvider>

{#if multiple}
	<ConsentManagerProvider options={{ mode: offline() }}>
		<ConsentDevToolsComponent position="bottom-right" />
	</ConsentManagerProvider>
{/if}
