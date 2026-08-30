<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { getDialogRootContext } from './context';

	const dialog = getDialogRootContext();

	const descriptionId = $derived(dialog.descriptionId);

	let {
		children,
		class: className,
		...restProps
	}: HTMLAttributes<HTMLParagraphElement> & {
		children?: Snippet;
		class?: string;
	} = $props();
</script>

<p
	id={descriptionId}
	class={className}
	data-slot="dialog-description"
	{...restProps}
>
	{@render children?.()}
</p>
