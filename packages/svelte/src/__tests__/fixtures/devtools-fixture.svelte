<script lang="ts">
	import ConsentManagerProvider from '../../lib/components/consent-manager-provider.svelte';
	import ConsentDevToolsComponent from '../../lib/devtools';
	import { offline } from '../../lib/transports/offline';

	let {
		multiple = false,
		position = 'top-left',
	}: {
		multiple?: boolean;
		position?: import('../../lib/devtools-options').ConsentDevToolsProps['position'];
	} = $props();
</script>

<ConsentManagerProvider options={{ mode: offline() }}>
	<ConsentDevToolsComponent {position} />
</ConsentManagerProvider>

{#if multiple}
	<ConsentManagerProvider options={{ mode: offline() }}>
		<ConsentDevToolsComponent position="bottom-right" />
	</ConsentManagerProvider>
{/if}
