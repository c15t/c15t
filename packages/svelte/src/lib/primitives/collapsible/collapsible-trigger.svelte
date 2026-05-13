<script lang="ts">
	import { getCollapsibleState, getDataDisabled } from '@c15t/ui/primitives';
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { getCollapsibleRootContext } from './context';

	const root = getCollapsibleRootContext();

	const open = $derived(root.open);
	const disabled = $derived(root.disabled);
	const triggerId = $derived(root.triggerId);
	const contentId = $derived(root.contentId);
	const dataState = $derived(getCollapsibleState(open));
	const dataDisabled = $derived(getDataDisabled(disabled));

	let {
		children,
		class: className,
		onclick,
		type = 'button',
		...restProps
	}: HTMLAttributes<HTMLButtonElement> & {
		children?: Snippet;
		class?: string;
		type?: 'button' | 'submit' | 'reset';
	} = $props();

	function handleClick(
		event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }
	) {
		root.toggle();
		onclick?.(event);
	}
</script>

<button
	type={type}
	id={triggerId}
	class={className}
	aria-controls={contentId}
	aria-disabled={disabled || undefined}
	aria-expanded={open}
	data-slot="collapsible-trigger"
	data-state={dataState}
	data-disabled={dataDisabled}
	disabled={disabled}
	{...restProps}
	onclick={handleClick}
>
	{@render children?.()}
</button>
