<script lang="ts">
	let { class: className, 'aria-hidden': ariaHidden, ...rest }: { class?: string; 'aria-hidden'?: boolean; [key: string]: unknown } = $props();
</script>

<svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden={ariaHidden} {...rest}>
	<circle cx="11" cy="11" r="8" />
	<line x1="21" y1="21" x2="16.65" y2="16.65" />
</svg>
