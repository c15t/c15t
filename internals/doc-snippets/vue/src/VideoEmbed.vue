<!-- #region docs:embed -->
<script setup lang="ts">
import { ConsentDialogLink, ConsentGate } from 'c15t/vue/vue-plugin';
</script>

<template>
	<ConsentGate category="measurement">
		<iframe
			src="https://www.youtube-nocookie.com/embed/czTksCF6X8Y"
			title="YouTube video"
			loading="lazy"
			allowfullscreen
		/>
		<template #placeholder>
			<p>Allow measurement to load this YouTube video.</p>
			<ConsentDialogLink>Choose video permissions</ConsentDialogLink>
		</template>
	</ConsentGate>
</template>
<!-- #endregion docs:embed -->
