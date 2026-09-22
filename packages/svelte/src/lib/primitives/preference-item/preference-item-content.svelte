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
		noStyle: localNoStyle,
		viewportClassName,
		...restProps
	}: HTMLAttributes<HTMLDivElement> & {
		children?: Snippet;
		class?: string;
		innerClassName?: string;
		/**
		 * Drop the primitive's built-in classes. Falls back to the root's
		 * `noStyle`, like the React primitive and the sibling trigger, so a
		 * headless root strips the whole item. A component that sets
		 * `noStyle` on its root only to own the item class passes an explicit
		 * `false` here, as every consent widget and IAB item does.
		 */
		noStyle?: boolean;
		/** Presentation class for the consent widget viewport.
		 * @internal
		 */
		viewportClassName?: string;
	} = $props();

	const open = $derived(context.open);
	const triggerId = $derived(context.triggerId);
	const contentId = $derived(context.contentId);
	const dataState = $derived(getPreferenceItemState(open));
	const noStyle = $derived(localNoStyle ?? context.noStyle);
	const contentClassName = $derived.by(() =>
		noStyle ? localClassName : variants.content({ class: localClassName })
	);
	const viewportClassNameValue = $derived.by(() =>
		noStyle
			? viewportClassName
			: variants.contentViewport({ class: viewportClassName })
	);
	const innerClassNameValue = $derived.by(() =>
		noStyle ? innerClassName : variants.contentInner({ class: innerClassName })
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
