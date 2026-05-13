<script lang="ts">
	import {
		getPreferenceItemState,
		PREFERENCE_ITEM_INTERNAL_SLOTS,
		PREFERENCE_ITEM_SLOTS,
	} from '@c15t/ui/primitives';
	import { preferenceItemVariants } from '@c15t/ui/styles/primitives';
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { getPreferenceItemContext } from './context';

	const context = getPreferenceItemContext();
	const variants = preferenceItemVariants();

	const open = $derived(context.open);
	const triggerId = $derived(context.triggerId);
	const contentId = $derived(context.contentId);
	const dataState = $derived(getPreferenceItemState(open));
	const contentClassName = $derived.by(() =>
		variants.content({ class: localClassName })
	);
	const viewportClassName = $derived.by(() => variants.contentViewport());
	const innerClassNameValue = $derived.by(() =>
		variants.contentInner({ class: innerClassName })
	);

	let {
		children,
		class: localClassName,
		innerClassName,
		...restProps
	}: HTMLAttributes<HTMLDivElement> & {
		children?: Snippet;
		class?: string;
		innerClassName?: string;
	} = $props();
</script>

<div
	id={contentId}
	aria-hidden={!open}
	aria-labelledby={triggerId}
	class={contentClassName}
	data-slot={PREFERENCE_ITEM_SLOTS.content}
	data-state={dataState}
	inert={!open}
	{...restProps}
>
	<div
		class={viewportClassName}
		data-slot={PREFERENCE_ITEM_INTERNAL_SLOTS.contentViewport}
	>
		<div
			class={innerClassNameValue}
			data-slot={PREFERENCE_ITEM_INTERNAL_SLOTS.contentInner}
		>
			{@render children?.()}
		</div>
	</div>
</div>
