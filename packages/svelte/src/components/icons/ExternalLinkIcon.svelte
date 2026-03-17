<script lang="ts">
	let { class: className, 'aria-hidden': ariaHidden, ...rest }: { class?: string; 'aria-hidden'?: boolean; [key: string]: unknown } = $props();
</script>

<svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden={ariaHidden} {...rest}>
	<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
	<polyline points="15 3 21 3 21 9" />
	<line x1="10" y1="14" x2="21" y2="3" />
</svg>
