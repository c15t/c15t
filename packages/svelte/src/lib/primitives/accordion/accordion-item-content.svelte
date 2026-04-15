<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { getOpenState } from '@c15t/ui/primitives';
	import { getAccordionItemContext } from './context';

	const item = getAccordionItemContext();

	const open = $derived(item.open);
	const triggerId = $derived(item.triggerId);
	const contentId = $derived(item.contentId);
	const dataState = $derived(getOpenState(open));

	let {
		children,
		class: className,
		...restProps
	}: HTMLAttributes<HTMLElement> & {
		children?: Snippet;
		class?: string;
	} = $props();
</script>

<section
	id={contentId}
	class={className}
	aria-hidden={!open}
	aria-labelledby={triggerId}
	data-slot="accordion-content"
	data-state={dataState}
	{...restProps}
>
	{@render children?.()}
</section>
