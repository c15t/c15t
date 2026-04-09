<script lang="ts">
	import { tabsVariants, getNextTabValue } from '@c15t/svelte';

	let activeTab = $state('vendors');
	const classes = tabsVariants();

	const tabValues = ['overview', 'vendors'];
	const tabLabels: Record<string, string> = {
		overview: 'Overview',
		vendors: 'Vendors',
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
			const target = (event.currentTarget as HTMLElement)
				?.closest('[role="tablist"]')
				?.querySelector(`[role="tab"][data-value="${nextValue}"]`) as HTMLElement | null;
			target?.focus();
		}
	}
</script>

<div class={classes.root()}>
	<div class={classes.list()} role="tablist" aria-orientation="horizontal">
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
				Current tab: {activeTab}
			</div>
		{/if}
	{/each}
</div>
