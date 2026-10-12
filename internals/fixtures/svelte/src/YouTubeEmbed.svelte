<script lang="ts">
	import { ConsentDialogLink, ConsentGate } from '@c15t/svelte';
</script>

<!-- The iframe mounts only while measurement is allowed. -->
<ConsentGate category="measurement">
	{#snippet placeholder()}<div class="placeholder">
			<p>Allow measurement to load this YouTube video.</p>
			<ConsentDialogLink>Choose video permissions</ConsentDialogLink>
		</div>{/snippet}
	<iframe
		title="YouTube video"
		src="https://www.youtube-nocookie.com/embed/czTksCF6X8Y?playsinline=1"
		allow="encrypted-media; picture-in-picture"
		allowfullscreen
	></iframe>
</ConsentGate>
