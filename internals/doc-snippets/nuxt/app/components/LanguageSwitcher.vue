<!-- #region docs:language-switcher title="app/components/LanguageSwitcher.vue" -->
<script setup lang="ts">
const language = useConsentLanguage();
const kernel = useConsentKernel();

// Resolving again with `init()` loads the banner and dialog text in the
// new language.
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
