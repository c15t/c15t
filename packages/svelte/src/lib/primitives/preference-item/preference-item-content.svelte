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
		forceMount = false,
		innerClassName,
		noStyle: localNoStyle,
		viewportClassName,
		...restProps
	}: HTMLAttributes<HTMLDivElement> & {
		children?: Snippet;
		class?: string;
		/**
		 * Render the children while the item has never been opened. By
		 * default they mount on first open and then stay mounted; collapsed
		 * content is `inert` and `aria-hidden` either way.
		 */
		forceMount?: boolean;
		innerClassName?: string;
		/**
		 * Drop the primitive's built-in classes. Falls back to the root's
		 * `noStyle`, like the React primitive and the sibling trigger, so a
		 * headless root strips the whole item. The IAB items set `noStyle`
		 * on their root only to own the item class and pass an explicit
		 * `false` here to keep the collapse rules; the consent widget
		 * inherits the root's `noStyle` and supplies the accordion classes
		 * itself, as React's does.
		 */
		noStyle?: boolean;
		/** Presentation class for the consent widget viewport.
		 * @internal
		 */
		viewportClassName?: string;
	} = $props();

	const open = $derived(context.open);
	// A collapsed body can hold a whole vendor list: mount it on first open
	// and keep it, so the close transition keeps its content.
	let hasOpened = $state(false);
	$effect.pre(() => {
		if (open) {
			hasOpened = true;
		}
	});
	const renderChildren = $derived(forceMount || open || hasOpened);
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
			{#if renderChildren}
				{@render children?.()}
			{/if}
		</div>
	</div>
</div>
