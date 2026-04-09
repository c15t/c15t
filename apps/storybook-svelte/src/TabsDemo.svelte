<script lang="ts">
	import { tabsVariants, getNextTabValue } from '@c15t/svelte';

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

	function handleKeydown(event: KeyboardEvent) {
		const nextValue = getNextTabValue({
			orientation: 'horizontal',
			loop: true,
			triggerValues: tabValues,
			currentValue: activeTab,
			key: event.key,
		});

		if (nextValue !== activeTab) {
			activeTab = nextValue;
			// Focus the newly active tab trigger
			const target = (event.currentTarget as HTMLElement)
				?.closest('[role="tablist"]')
				?.querySelector(`[role="tab"][data-value="${nextValue}"]`) as HTMLElement | null;
			target?.focus();
		}
	}

	function getDescription(tab: string): string {
		const descriptions: Record<string, string> = {
			overview: overviewDescription,
			vendors: vendorsDescription,
			storage: storageDescription,
		};
		return descriptions[tab] ?? '';
	}
</script>

<div class={classes.root()}>
	<div class={classes.list()} role="tablist">
		{#each tabValues as tab}
			<button
				class={classes.trigger()}
				role="tab"
				type="button"
				aria-selected={String(activeTab === tab)}
				data-state={activeTab === tab ? 'active' : 'inactive'}
				data-value={tab}
				tabindex={activeTab === tab ? 0 : -1}
				onclick={() => { activeTab = tab; }}
				onkeydown={handleKeydown}
			>
				{tabLabels[tab]}
			</button>
		{/each}
	</div>
	{#each tabValues as tab}
		{#if activeTab === tab}
			<div
				class={classes.content()}
				role="tabpanel"
				style="border:1px solid var(--c15t-border);border-radius:var(--c15t-radius-md);display:grid;gap:0.5rem;padding:1rem;width:28rem;"
			>
				<strong>{tabLabels[tab]}</strong>
				<p style="margin:0;">{getDescription(tab)}</p>
			</div>
		{/if}
	{/each}
</div>
