<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { getCollapsibleState } from '@c15t/ui/primitives';
	import { getCollapsibleRootContext } from './context';

	const root = getCollapsibleRootContext();

	const open = $derived(root.open);
	const contentId = $derived(root.contentId);
	const triggerId = $derived(root.triggerId);
	const dataState = $derived(getCollapsibleState(open));

	let {
		children,
		class: className,
		...restProps
	}: HTMLAttributes<HTMLDivElement> & {
		children?: Snippet;
		class?: string;
	} = $props();
</script>

<div
	id={contentId}
	class={className}
	aria-hidden={!open}
	aria-labelledby={triggerId}
	data-slot="collapsible-content"
	data-state={dataState}
	inert={!open}
	{...restProps}
>
	{@render children?.()}
</div>
