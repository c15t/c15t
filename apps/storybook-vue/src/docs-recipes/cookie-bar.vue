<!-- #region docs:headless-bar title="src/CookieBar.vue" -->
<script setup lang="ts">
import {
	useConsentActiveUI,
	useConsentPolicyActions,
	useConsentSave,
	useDismissNotice,
	usePromptRequirement,
} from 'c15t/vue/vue-plugin';
import { computed } from 'vue';

import './cookie-bar.css';

const labels: Record<string, string> = {
	accept: 'Accept all',
	dismiss: 'Got it',
	reject: 'Reject all',
};

const activeUI = useConsentActiveUI();
const prompt = usePromptRequirement();
const { actionGroups } = useConsentPolicyActions('prompt');
const saveConsent = useConsentSave();
const dismissNotice = useDismissNotice();

const isVisible = computed(
	() => activeUI.value === 'banner' && prompt.value.kind !== 'none'
);

// The policy decides which actions this visitor gets, and in what order.
// Preferences has its own button, so it is always there.
const actions = computed(() =>
	actionGroups.value.flat().filter((action) => action in labels)
);

const run = (action: string) => {
	if (action === 'accept') {
		void saveConsent('all');
	} else if (action === 'reject') {
		void saveConsent('none');
	} else if (action === 'dismiss') {
		void dismissNotice();
	}
};
</script>

<template>
	<section
		v-if="isVisible"
		class="cookie-bar"
		aria-label="Cookie consent"
	>
		<p class="cookie-bar__text">
			We use cookies to measure traffic and improve this site. Choose which ones
			can run.
		</p>
		<div class="cookie-bar__actions">
			<button
				type="button"
				class="cookie-bar__link"
				@click="activeUI = 'manager'"
			>
				Preferences
			</button>
			<button
				v-for="action in actions"
				:key="action"
				type="button"
				class="cookie-bar__button"
				@click="run(action)"
			>
				{{ labels[action] }}
			</button>
		</div>
	</section>
</template>
<!-- #endregion docs:headless-bar -->
