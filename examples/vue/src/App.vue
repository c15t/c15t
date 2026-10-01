<!-- #region docs:app -->
<script setup lang="ts">
import ConsentRoot from 'c15t/vue/consent-root';
import ConsentPreferencesLink from 'c15t/vue/runtime/components/consent-preferences-link.vue';

import HomePage from './HomePage.vue';
</script>

<template>
	<ConsentRoot />
	<HomePage />
	<footer>
		<ConsentPreferencesLink>Privacy settings</ConsentPreferencesLink>
	</footer>
</template>
<!-- #endregion docs:app -->
