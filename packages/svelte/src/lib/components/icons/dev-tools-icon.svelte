<script lang="ts">
	// Code icon for the DevTools item the consent trigger shows while
	// ConsentDevTools is mounted. Decorative; the item carries the accessible
	// name.
	let { class: className }: { class?: string } = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
	focusable="false"
	class={className}
>
	<path d="m18 16 4-4-4-4" />
	<path d="m6 8-4 4 4 4" />
	<path d="m14.5 4-5 16" />
</svg>
