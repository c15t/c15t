<script lang="ts">
	import ConsentManagerProvider from '../../lib/components/consent-manager-provider.svelte';
	import ConsentDevToolsComponent from '../../lib/devtools';

	let { multiple = false }: { multiple?: boolean } = $props();
</script>

<ConsentManagerProvider options={{ mode: 'offline' }}>
	<ConsentDevToolsComponent position="top-left" />
</ConsentManagerProvider>

{#if multiple}
	<ConsentManagerProvider options={{ mode: 'offline' }}>
		<ConsentDevToolsComponent position="bottom-right" />
	</ConsentManagerProvider>
{/if}
