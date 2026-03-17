<script lang="ts">
	let { class: className, 'aria-hidden': ariaHidden, 'aria-label': ariaLabel, ...rest }: { class?: string; 'aria-hidden'?: boolean; 'aria-label'?: string; [key: string]: unknown } = $props();
</script>

<svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden={ariaHidden} aria-label={ariaLabel} {...rest}>
	<circle cx="12" cy="12" r="10" />
	<line x1="12" y1="16" x2="12" y2="12" />
	<line x1="12" y1="8" x2="12.01" y2="8" />
</svg>
