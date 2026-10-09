<!-- #region docs:app -->
<script setup lang="ts">
import { ConsentDialogLink, ConsentRoot } from 'c15t/vue/vue-plugin';
</script>

<template>
	<ConsentRoot />
	<main>
		<h1>c15t with Vue</h1>
		<p>PostHog loads after you allow measurement.</p>
	</main>
	<footer>
		<ConsentDialogLink>Privacy settings</ConsentDialogLink>
	</footer>
</template>
<!-- #endregion docs:app -->
