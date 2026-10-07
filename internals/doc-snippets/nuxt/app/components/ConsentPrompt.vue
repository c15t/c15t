<!-- #region docs:headless-prompt -->
<script setup lang="ts">
const activeUI = useConsentActiveUI();
const saveConsent = useConsentSave();
const { displayedCategories, save: saveDraft, values } = useConsentDraft();

// Recording a choice satisfies the prompt, so c15t closes the banner itself.
const choose = (choice: 'all' | 'none') => {
	void saveConsent(choice);
};

// Preferences stay open until you close them. c15t records the draft
// locally before the network request, so closing right away is safe.
const savePreferences = () => {
	void saveDraft();
	activeUI.value = null;
};
</script>

<template>
	<section
		v-if="activeUI === 'banner'"
		class="consent-prompt"
		aria-label="Cookie consent"
	>
		<p>We use cookies for measurement and marketing.</p>
		<button
			type="button"
			@click="choose('none')"
		>
			Reject all
		</button>
		<button
			type="button"
			@click="choose('all')"
		>
			Accept all
		</button>
		<button
			type="button"
			@click="activeUI = 'manager'"
		>
			Customize
		</button>
	</section>
	<section
		v-else-if="activeUI === 'manager'"
		class="consent-prompt"
		aria-label="Privacy settings"
	>
		<label
			v-for="category in displayedCategories"
			:key="category"
		>
			<input
				v-model="values[category]"
				type="checkbox"
				:disabled="category === 'necessary'"
			/>
			{{ category }}
		</label>
		<button
			type="button"
			@click="savePreferences"
		>
			Save
		</button>
	</section>
</template>
<!-- #endregion docs:headless-prompt -->
