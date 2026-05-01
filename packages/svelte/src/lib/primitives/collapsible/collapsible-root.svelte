<script lang="ts">
	import { untrack } from 'svelte';
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { getCollapsibleState, getDataDisabled, toggleCollapsibleValue } from '@c15t/ui/primitives';
	import { setCollapsibleRootContext } from './context';

	const componentId = $props.id();

	let {
		children,
		class: className,
		defaultOpen = false,
		disabled = false,
		onOpenChange,
		open: openProp,
		...restProps
	}: HTMLAttributes<HTMLDivElement> & {
		children?: Snippet;
		class?: string;
		defaultOpen?: boolean;
		disabled?: boolean;
		onOpenChange?: (details: { open: boolean }) => void;
		open?: boolean;
	} = $props();

	let internalOpen = $state(untrack(() => defaultOpen));

	const open = $derived(openProp ?? internalOpen);
	const dataState = $derived(getCollapsibleState(open));
	const dataDisabled = $derived(getDataDisabled(disabled));
	const triggerId = `c15t-collapsible-trigger-${componentId}`;
	const contentId = `c15t-collapsible-content-${componentId}`;

	function setOpen(nextOpen: boolean) {
		if (disabled) {
			return;
		}

		if (openProp === undefined) {
			internalOpen = nextOpen;
		}

		onOpenChange?.({ open: nextOpen });
	}

	function toggle() {
		setOpen(toggleCollapsibleValue(open));
	}

	setCollapsibleRootContext({
		get contentId() {
			return contentId;
		},
		get disabled() {
			return disabled;
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
	class={className}
	data-slot="collapsible-root"
	data-state={dataState}
	data-disabled={dataDisabled}
	{...restProps}
>
	{@render children?.()}
</div>
