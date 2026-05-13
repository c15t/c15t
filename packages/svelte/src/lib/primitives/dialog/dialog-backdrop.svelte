<script lang="ts">
	import { getDialogState } from '@c15t/ui/primitives';
	import type { HTMLAttributes } from 'svelte/elements';
	import { getDialogRootContext } from './context';

	const dialog = getDialogRootContext();

	const open = $derived(dialog.open);
	const shouldRender = $derived(dialog.shouldRender);
	const dataState = $derived(getDialogState(open));

	let {
		class: className,
		onclick,
		...restProps
	}: HTMLAttributes<HTMLDivElement> & {
		class?: string;
	} = $props();

	function handleClick(
		event: MouseEvent & { currentTarget: EventTarget & HTMLDivElement }
	) {
		dialog.requestClose('backdrop');
		onclick?.(event);
	}
</script>

{#if shouldRender}
	<div
		role="presentation"
		aria-hidden="true"
		class={className}
		data-slot="dialog-backdrop"
		data-state={dataState}
		{...restProps}
		onclick={handleClick}
	></div>
{/if}
