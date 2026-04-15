<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { getDialogRootContext } from './context';

	const dialog = getDialogRootContext();

	const titleId = $derived(dialog.titleId);

	let {
		children,
		class: className,
		...restProps
	}: HTMLAttributes<HTMLHeadingElement> & {
		children?: Snippet;
		class?: string;
	} = $props();
</script>

<h2 id={titleId} class={className} data-slot="dialog-title" {...restProps}>
	{@render children?.()}
</h2>
