<!--
	Not mounted in this example. The docs publish it, and `check-types`
	verifies its imports against the package.
-->
<!-- #region docs:language-switcher title="src/LanguageSwitcher.vue" -->
<script setup lang="ts">
import { useConsentKernel, useConsentLanguage } from 'c15t/vue/vue-plugin';

const language = useConsentLanguage();
const kernel = useConsentKernel();

// Setting the language only stores it. Resolving again fetches the banner
// and dialog text in that language.
const switchTo = (code: string) => {
	language.value = code;
	void kernel.commands.init();
};
</script>

<template>
	<button
		type="button"
		@click="switchTo('en')"
	>
		English
	</button>
	<button
		type="button"
		@click="switchTo('de')"
	>
		Deutsch
	</button>
</template>
<!-- #endregion docs:language-switcher -->
