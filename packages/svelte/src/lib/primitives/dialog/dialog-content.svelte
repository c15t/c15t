<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { isDialogDismissKey, getDialogState } from '@c15t/ui/primitives';
	import { focusTrap } from '../../actions/focus-trap';
	import { scrollLock } from '../../actions/scroll-lock';
	import { getDialogRootContext } from './context';

	const dialog = getDialogRootContext();

	let node = $state<HTMLElement | null>(null);

	const open = $derived(dialog.open);
	const shouldRender = $derived(dialog.shouldRender);
	const contentId = $derived(dialog.contentId);
	const titleId = $derived(dialog.titleId);
	const descriptionId = $derived(dialog.descriptionId);
	const dataState = $derived(getDialogState(open));

	let {
		children,
		class: className,
		...restProps
	}: HTMLAttributes<HTMLDivElement> & {
		children?: Snippet;
		class?: string;
	} = $props();

	function handleKeyDown(event: KeyboardEvent) {
		if (isDialogDismissKey(event.key)) {
			event.preventDefault();
			dialog.requestClose('escape');
		}
	}

	$effect(() => {
		if (!open || !node) {
			return;
		}

		queueMicrotask(() => {
			if (!node || !open) {
				return;
			}

			const activeElement = document.activeElement;
			if (!activeElement || !node.contains(activeElement)) {
				const preferredFocusTarget = node.querySelector<HTMLElement>(
					'[data-c15t-dialog-focus="true"]'
				);
				(preferredFocusTarget ?? node).focus();
			}
		});
	});
</script>

{#if shouldRender}
	<div
		bind:this={node}
		id={contentId}
		role="dialog"
		tabindex={-1}
		aria-modal="true"
		aria-labelledby={titleId}
		aria-describedby={descriptionId}
		class={className}
		data-slot="dialog-content"
		data-state={dataState}
		use:focusTrap={open && dialog.trapFocus}
		use:scrollLock={open && dialog.preventScroll}
		onkeydown={handleKeyDown}
		{...restProps}
	>
		{@render children?.()}
	</div>
{/if}
