<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { getTabPanelState } from '@c15t/ui/primitives';
	import { getTabsRootContext } from './context';

	const root = getTabsRootContext();

	let {
		children,
		class: className,
		forceMount = false,
		value,
		...restProps
	}: HTMLAttributes<HTMLDivElement> & {
		children?: Snippet;
		class?: string;
		forceMount?: boolean;
		value: string;
	} = $props();

	const baseId = $derived(root.baseId);
	const selectedValue = $derived(root.value);
	const isSelected = $derived(selectedValue === value);
	const dataState = $derived(getTabPanelState(isSelected));
	const contentId = $derived(`${baseId}-content-${value}`);
	const triggerId = $derived(`${baseId}-trigger-${value}`);
</script>

{#if forceMount || isSelected}
	<div
		id={contentId}
		role="tabpanel"
		tabindex={0}
		hidden={!isSelected}
		aria-labelledby={triggerId}
		class={className}
		data-slot="tabs-content"
		data-state={dataState}
		{...restProps}
	>
		{@render children?.()}
	</div>
{/if}
