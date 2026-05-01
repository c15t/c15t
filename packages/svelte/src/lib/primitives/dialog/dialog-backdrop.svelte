<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { getDialogState } from '@c15t/ui/primitives';
	import { getDialogRootContext } from './context';

	const dialog = getDialogRootContext();

	const open = $derived(dialog.open);
	const shouldRender = $derived(dialog.shouldRender);
	const dataState = $derived(getDialogState(open));

	let {
		class: className,
		...restProps
	}: HTMLAttributes<HTMLDivElement> & {
		class?: string;
	} = $props();
</script>

{#if shouldRender}
	<div
		role="presentation"
		aria-hidden="true"
		class={className}
		data-slot="dialog-backdrop"
		data-state={dataState}
		onclick={() => dialog.requestClose('backdrop')}
		{...restProps}
	></div>
{/if}
