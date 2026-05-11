<script lang="ts">
	import { getDialogState } from '@c15t/ui/primitives';
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { getDialogRootContext } from './context';

	const dialog = getDialogRootContext();

	const open = $derived(dialog.open);
	const dataState = $derived(getDialogState(open));

	let {
		children,
		class: className,
		disabled = false,
		onclick,
		type = 'button',
		...restProps
	}: HTMLAttributes<HTMLButtonElement> & {
		children?: Snippet;
		class?: string;
		disabled?: boolean;
		type?: 'button' | 'submit' | 'reset';
	} = $props();

	function handleClick(
		event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }
	) {
		if (!disabled) {
			dialog.requestClose('close-trigger');
		}
		onclick?.(event);
	}
</script>

<button
	type={type}
	class={className}
	data-slot="dialog-close"
	data-state={dataState}
	data-disabled={disabled ? '' : undefined}
	{disabled}
	{...restProps}
	onclick={handleClick}
>
	{@render children?.()}
</button>
