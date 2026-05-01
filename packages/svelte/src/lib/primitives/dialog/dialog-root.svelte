<script lang="ts">
	import { untrack } from 'svelte';
	import type { Snippet } from 'svelte';
	import { setDialogRootContext } from './context';

	const componentId = $props.id();

	let {
		children,
		closeOnEscape = true,
		closeOnInteractOutside = true,
		defaultOpen = false,
		lazyMount = false,
		onOpenChange,
		open: openProp,
		preventScroll = false,
		trapFocus = true,
		unmountOnExit = false,
	}: {
		children?: Snippet;
		closeOnEscape?: boolean;
		closeOnInteractOutside?: boolean;
		defaultOpen?: boolean;
		lazyMount?: boolean;
		onOpenChange?: (details: { open: boolean }) => void;
		open?: boolean;
		preventScroll?: boolean;
		trapFocus?: boolean;
		unmountOnExit?: boolean;
	} = $props();

	let internalOpen = $state(untrack(() => defaultOpen));
	let hasOpened = $state(untrack(() => defaultOpen));
	let lastOpen = untrack(() => defaultOpen);
	let restoreFocusElement: HTMLElement | null = null;

	const open = $derived(openProp ?? internalOpen);
	const shouldRender = $derived(
		open || (!unmountOnExit && (!lazyMount || hasOpened))
	);
	const contentId = `c15t-dialog-content-${componentId}`;
	const titleId = `c15t-dialog-title-${componentId}`;
	const descriptionId = `c15t-dialog-description-${componentId}`;

	function setOpen(nextOpen: boolean) {
		if (openProp === undefined) {
			internalOpen = nextOpen;
		}

		onOpenChange?.({ open: nextOpen });
	}

	function requestClose(reason: 'backdrop' | 'close-trigger' | 'escape') {
		if (reason === 'escape' && !closeOnEscape) {
			return;
		}

		if (reason === 'backdrop' && !closeOnInteractOutside) {
			return;
		}

		setOpen(false);
	}

	$effect(() => {
		if (open) {
			hasOpened = true;
		}
	});

	$effect(() => {
		if (typeof document === 'undefined') {
			return;
		}

		if (open && !lastOpen) {
			restoreFocusElement = document.activeElement as HTMLElement | null;
		}

		if (!open && lastOpen) {
			restoreFocusElement?.focus();
		}

		lastOpen = open;
	});

	setDialogRootContext({
		get closeOnEscape() {
			return closeOnEscape;
		},
		get closeOnInteractOutside() {
			return closeOnInteractOutside;
		},
		get contentId() {
			return contentId;
		},
		get descriptionId() {
			return descriptionId;
		},
		get open() {
			return open;
		},
		get preventScroll() {
			return preventScroll;
		},
		get shouldRender() {
			return shouldRender;
		},
		get titleId() {
			return titleId;
		},
		get trapFocus() {
			return trapFocus;
		},
		requestClose,
	});
</script>

{@render children?.()}
