<script lang="ts">
	import { getDataDisabled, getOpenState } from '@c15t/ui/primitives';
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { getAccordionItemContext, getAccordionRootContext } from './context';

	const root = getAccordionRootContext();
	const item = getAccordionItemContext();

	const open = $derived(item.open);
	const disabled = $derived(item.disabled);
	const triggerId = $derived(item.triggerId);
	const contentId = $derived(item.contentId);
	const itemValue = $derived(item.value);
	const dataState = $derived(getOpenState(open));
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
		root.toggleItem(itemValue);
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
	data-slot="accordion-trigger"
	data-state={dataState}
	data-disabled={dataDisabled}
	disabled={disabled}
	{...restProps}
	onclick={handleClick}
>
	{@render children?.()}
</button>
