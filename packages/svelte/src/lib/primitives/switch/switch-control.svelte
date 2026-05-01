<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		children,
		class: className,
		...restProps
	}: HTMLAttributes<HTMLSpanElement> & {
		children?: Snippet;
		class?: string;
	} = $props();
</script>

<span class={className} data-slot="switch-track" {...restProps}>
	{@render children?.()}
</span>
