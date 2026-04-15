<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { getDialogState } from '@c15t/ui/primitives';
	import { getDialogRootContext } from './context';

	const dialog = getDialogRootContext();

	const open = $derived(dialog.open);
	const shouldRender = $derived(dialog.shouldRender);
	const dataState = $derived(getDialogState(open));

	let {
		children,
		class: className,
		...restProps
	}: HTMLAttributes<HTMLDivElement> & {
		children?: Snippet;
		class?: string;
	} = $props();
</script>

{#if shouldRender}
	<div class={className} data-slot="dialog-positioner" data-state={dataState} {...restProps}>
		{@render children?.()}
	</div>
{/if}
