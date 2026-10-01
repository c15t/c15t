<!--
	Not mounted in this example. The docs publish it, and `check-types`
	verifies its imports and props against the package.
-->
<!-- #region docs:privacy-settings title="src/PrivacySettings.vue" -->
<script setup lang="ts">
import ConsentWidget from 'c15t/vue/consent-widget';
</script>

<template>
	<section aria-labelledby="privacy-settings-title">
		<h1 id="privacy-settings-title">Privacy settings</h1>
		<p>Choose which optional cookies this site may use.</p>
		<ConsentWidget />
	</section>
</template>
<!-- #endregion docs:privacy-settings -->
