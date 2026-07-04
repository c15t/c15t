<script lang="ts">
	import { Tabs, tabsVariants } from '@c15t/svelte';

	interface Props {
		overviewDescription?: string;
		vendorsDescription?: string;
		storageDescription?: string;
	}

	const {
		overviewDescription = 'Use tabs for grouped content that shares a single disclosure region.',
		vendorsDescription = 'The IAB dialog uses this pattern for purposes and vendor disclosures.',
		storageDescription = 'Keyboard navigation supports arrow keys, Home, and End.',
	}: Props = $props();

	let activeTab = $state('overview');
	const classes = tabsVariants();

	const tabValues = ['overview', 'vendors', 'storage'];
	const tabLabels: Record<string, string> = {
		overview: 'Overview',
		vendors: 'Vendors',
		storage: 'Storage',
	};

	function getDescription(tab: string): string {
		const descriptions: Record<string, string> = {
			overview: overviewDescription,
			vendors: vendorsDescription,
			storage: storageDescription,
		};
		return descriptions[tab] ?? '';
	}
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
			<strong>{tabLabels[tab]}</strong>
			<p style="margin:0;">{getDescription(tab)}</p>
		</Tabs.Content>
	{/each}
</Tabs.Root>
