<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		class: className,
		...restProps
	}: HTMLAttributes<HTMLSpanElement> & { class?: string } = $props();
</script>

<span class={className} data-slot="switch-thumb" {...restProps}></span>
