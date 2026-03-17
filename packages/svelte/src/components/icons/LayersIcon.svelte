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
	<path d="M12 2L2 7l10 5 10-5-10-5z" />
	<path d="M2 17l10 5 10-5" />
	<path d="M2 12l10 5 10-5" />
</svg>
