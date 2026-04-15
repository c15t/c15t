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
		type = 'button',
		...restProps
	}: HTMLAttributes<HTMLButtonElement> & {
		class?: string;
		type?: 'button' | 'submit' | 'reset';
	} = $props();
</script>

{#if shouldRender}
	<button
		type={type}
		tabindex={-1}
		aria-label="Dismiss dialog"
		class={className}
		data-slot="dialog-backdrop"
		data-state={dataState}
		onclick={() => dialog.requestClose('backdrop')}
		{...restProps}
	></button>
{/if}
