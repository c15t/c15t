<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { getDialogState } from '@c15t/ui/primitives';
	import { getDialogRootContext } from './context';

	const dialog = getDialogRootContext();

	const open = $derived(dialog.open);
	const dataState = $derived(getDialogState(open));

	let {
		children,
		class: className,
		disabled = false,
		type = 'button',
		...restProps
	}: HTMLAttributes<HTMLButtonElement> & {
		children?: Snippet;
		class?: string;
		disabled?: boolean;
		type?: 'button' | 'submit' | 'reset';
	} = $props();
</script>

<button
	type={type}
	class={className}
	data-slot="dialog-close"
	data-state={dataState}
	data-disabled={disabled ? '' : undefined}
	{disabled}
	onclick={() => {
		if (!disabled) {
			dialog.requestClose('close-trigger');
		}
	}}
	{...restProps}
>
	{@render children?.()}
</button>
