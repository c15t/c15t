<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { getCollapsibleState } from '@c15t/ui/primitives';
	import { getCollapsibleRootContext } from './context';

	const root = getCollapsibleRootContext();

	const dataState = $derived(getCollapsibleState(root.open));

	let {
		children,
		class: className,
		...restProps
	}: HTMLAttributes<HTMLSpanElement> & {
		children?: Snippet;
		class?: string;
	} = $props();
</script>

<span class={className} data-slot="collapsible-indicator" data-state={dataState} {...restProps}>
	{@render children?.()}
</span>
