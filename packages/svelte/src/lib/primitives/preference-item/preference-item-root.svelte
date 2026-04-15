<script lang="ts">
	import {
		getDataDisabled,
		getPreferenceItemState,
		PREFERENCE_ITEM_SLOTS,
		togglePreferenceItemValue,
	} from '@c15t/ui/primitives';
	import { preferenceItemVariants } from '@c15t/ui/styles/primitives';
	import { untrack } from 'svelte';
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { getThemeContext } from '../../context.svelte';
	import { setPreferenceItemContext } from './context';

	const componentId = $props.id();
	const theme = getThemeContext();
	const variants = preferenceItemVariants();

	let {
		children,
		class: className,
		defaultOpen = false,
		disabled = false,
		noStyle: localNoStyle,
		onOpenChange,
		open: openProp,
		...restProps
	}: HTMLAttributes<HTMLDivElement> & {
		children?: Snippet;
		class?: string;
		defaultOpen?: boolean;
		disabled?: boolean;
		noStyle?: boolean;
		onOpenChange?: (details: { open: boolean }) => void;
		open?: boolean;
	} = $props();

	let internalOpen = $state(untrack(() => defaultOpen));

	const open = $derived(openProp ?? internalOpen);
	const noStyle = $derived(localNoStyle ?? theme.noStyle ?? false);
	const rootClassName = $derived(
		noStyle ? className : variants.root({ class: className })
	);
	const dataState = $derived(getPreferenceItemState(open));
	const dataDisabled = $derived(getDataDisabled(disabled));
	const contentId = `c15t-preference-item-content-${componentId}`;
	const triggerId = `c15t-preference-item-trigger-${componentId}`;

	function setOpen(nextOpen: boolean) {
		if (openProp === undefined) {
			internalOpen = nextOpen;
		}

		onOpenChange?.({ open: nextOpen });
	}

	function toggle() {
		if (!disabled) {
			setOpen(togglePreferenceItemValue(open));
		}
	}

	setPreferenceItemContext({
		get contentId() {
			return contentId;
		},
		get disabled() {
			return disabled;
		},
		get noStyle() {
			return noStyle;
		},
		get open() {
			return open;
		},
		get triggerId() {
			return triggerId;
		},
		setOpen,
		toggle,
	});
</script>

<div
	class={rootClassName}
	data-slot={PREFERENCE_ITEM_SLOTS.root}
	data-state={dataState}
	data-disabled={dataDisabled}
	{...restProps}
>
	{@render children?.()}
</div>
