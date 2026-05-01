<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { portal } from '../../actions/portal';

	let {
		children,
		target = 'body',
		...restProps
	}: HTMLAttributes<HTMLDivElement> & {
		children?: Snippet;
		target?: HTMLElement | string;
	} = $props();
</script>

<div use:portal={target} style="display: contents;" {...restProps}>
	{@render children?.()}
</div>
