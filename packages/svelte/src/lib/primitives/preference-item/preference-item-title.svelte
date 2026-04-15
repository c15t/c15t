<script lang="ts">
	import { PREFERENCE_ITEM_SLOTS } from '@c15t/ui/primitives';
	import { preferenceItemVariants } from '@c15t/ui/styles/primitives';
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { getPreferenceItemContext } from './context';

	const context = getPreferenceItemContext();
	const variants = preferenceItemVariants();

	const noStyle = $derived(context.noStyle);
	const className = $derived.by(() =>
		noStyle ? localClassName : variants.title({ class: localClassName })
	);

	let {
		children,
		class: localClassName,
		...restProps
	}: HTMLAttributes<HTMLHeadingElement> & {
		children?: Snippet;
		class?: string;
	} = $props();
</script>

<h3 class={className} data-slot={PREFERENCE_ITEM_SLOTS.title} {...restProps}>
	{@render children?.()}
</h3>
