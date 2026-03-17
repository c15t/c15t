<script lang="ts">
	let {
		class: className,
		'aria-hidden': ariaHidden,
		...rest
	}: { class?: string; 'aria-hidden'?: boolean; [key: string]: unknown } = $props();
</script>

<svg
	class={className}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	aria-hidden={ariaHidden}
	{...rest}
>
	<path d="M19 9l-7 7-7-7" />
</svg>
