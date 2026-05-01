<script lang="ts">
	import {
		getDataDisabled,
		getPreferenceItemState,
		PREFERENCE_ITEM_SLOTS,
	} from '@c15t/ui/primitives';
	import { preferenceItemVariants } from '@c15t/ui/styles/primitives';
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { getPreferenceItemContext } from './context';

	const context = getPreferenceItemContext();
	const variants = preferenceItemVariants();

	const open = $derived(context.open);
	const disabled = $derived(context.disabled);
	const noStyle = $derived(context.noStyle);
	const triggerId = $derived(context.triggerId);
	const contentId = $derived(context.contentId);
	const className = $derived.by(() =>
		noStyle ? localClassName : variants.trigger({ class: localClassName })
	);
	const dataState = $derived(getPreferenceItemState(open));
	const dataDisabled = $derived(getDataDisabled(disabled));

	let {
		children,
		class: localClassName,
		type = 'button',
		...restProps
	}: HTMLAttributes<HTMLButtonElement> & {
		children?: Snippet;
		class?: string;
		type?: 'button' | 'submit' | 'reset';
	} = $props();
</script>

<button
	type={type}
	id={triggerId}
	aria-controls={contentId}
	aria-disabled={disabled || undefined}
	aria-expanded={open}
	class={className}
	data-slot={PREFERENCE_ITEM_SLOTS.trigger}
	data-state={dataState}
	data-disabled={dataDisabled}
	disabled={disabled}
	onclick={() => context.toggle()}
	{...restProps}
>
	{@render children?.()}
</button>
