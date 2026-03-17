<script lang="ts">
	let { class: className, 'aria-hidden': ariaHidden, 'aria-label': ariaLabel, ...rest }: { class?: string; 'aria-hidden'?: boolean; 'aria-label'?: string; [key: string]: unknown } = $props();
</script>

<svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden={ariaHidden} aria-label={ariaLabel} {...rest}>
	<circle cx="12" cy="12" r="10" />
	<line x1="2" y1="12" x2="22" y2="12" />
	<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
</svg>
