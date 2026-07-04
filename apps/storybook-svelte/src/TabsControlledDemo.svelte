<script lang="ts">
	import { Tabs, tabsVariants } from '@c15t/svelte';

	let activeTab = $state('vendors');
	const classes = tabsVariants();

	const tabValues = ['overview', 'vendors'];
	const tabLabels: Record<string, string> = {
		overview: 'Overview',
		vendors: 'Vendors',
	};

</script>

<Tabs.Root bind:value={activeTab} class={classes.root()}>
	<Tabs.List class={classes.list()}>
		{#each tabValues as tab}
			<Tabs.Trigger
				value={tab}
				class={classes.trigger()}
				data-value={tab}
			>
				{tabLabels[tab]}
			</Tabs.Trigger>
		{/each}
	</Tabs.List>
	{#each tabValues as tab}
		<Tabs.Content
			value={tab}
			class={classes.content()}
			style="border:1px solid var(--c15t-border);border-radius:var(--c15t-radius-md);display:grid;gap:0.5rem;padding:1rem;width:28rem;"
		>
			Current tab: {activeTab}
		</Tabs.Content>
	{/each}
</Tabs.Root>
