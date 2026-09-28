<script lang="ts">
	import { getDialogState, isDialogDismissKey } from '@c15t/ui/primitives';
	import { getFocusableElements } from '@c15t/ui/utils';
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

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
		onkeydown,
		...restProps
	}: HTMLAttributes<HTMLDivElement> & {
		children?: Snippet;
		class?: string;
	} = $props();

	const handleKeyDown = function handleKeyDown(
		event: KeyboardEvent & { currentTarget: EventTarget & HTMLDivElement }
	) {
		if (isDialogDismissKey(event.key)) {
			event.preventDefault();
			dialog.requestClose('escape');
		}
		onkeydown?.(event);
	};

	$effect(() => {
		if (!open || !node) {
			return;
		}

		queueMicrotask(() => {
			if (!node || !open) {
				return;
			}

			const { activeElement } = document;
			if (!activeElement || !node.contains(activeElement)) {
				// Same target as the trap's `first-tabbable`, chosen here so the
				// trap never has to move focus a second time.
				const preferredFocusTarget = node.querySelector<HTMLElement>(
					'[data-c15t-dialog-focus="true"]'
				);
				(preferredFocusTarget ?? getFocusableElements(node)[0] ?? node).focus();
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
		aria-modal={dialog.trapFocus ? 'true' : undefined}
		aria-labelledby={titleId}
		aria-describedby={descriptionId}
		class={className}
		data-slot="dialog-content"
		data-state={dataState}
		use:focusTrap={{
			enabled: open && dialog.trapFocus,
			initialFocus: 'first-tabbable',
		}}
		use:scrollLock={open && dialog.preventScroll}
		{...restProps}
		onkeydown={handleKeyDown}
	>
		{@render children?.()}
	</div>
{/if}
