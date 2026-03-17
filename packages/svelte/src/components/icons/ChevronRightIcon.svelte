<script lang="ts">
	let { class: className, width = '16', height = '16', 'aria-hidden': ariaHidden, ...rest }: { class?: string; width?: string; height?: string; 'aria-hidden'?: boolean; [key: string]: unknown } = $props();
</script>

<svg class={className} {width} {height} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden={ariaHidden} {...rest}>
	<path d="M9 5l7 7-7 7" />
</svg>
