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

	let {
		children,
		class: localClassName,
		innerClassName,
		viewportClassName,
		...restProps
	}: HTMLAttributes<HTMLDivElement> & {
		children?: Snippet;
		class?: string;
		innerClassName?: string;
		/** Presentation class for the consent widget viewport.
		 * @internal
		 */
		viewportClassName?: string;
	} = $props();

	const open = $derived(context.open);
	const triggerId = $derived(context.triggerId);
	const contentId = $derived(context.contentId);
	const dataState = $derived(getPreferenceItemState(open));
	const contentClassName = $derived.by(() =>
		variants.content({ class: localClassName })
	);
	const viewportClassNameValue = $derived.by(() =>
		variants.contentViewport({ class: viewportClassName })
	);
	const innerClassNameValue = $derived.by(() =>
		variants.contentInner({ class: innerClassName })
	);
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
		class={viewportClassNameValue}
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
