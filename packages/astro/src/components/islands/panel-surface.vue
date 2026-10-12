<!--
	The on-demand Vue dialog island.

	Mounted as its own Vue app the first time something opens a dialog —
	never with `client:load` — so a visitor who never opens the preference
	centre downloads no consent UI at all.

	The adapter installs `c15tVue` with the page's runtime before mounting
	this component: Astro islands cannot see each other's provides, so the
	kernel has to be owned outside the app. The plugin borrows it and leaves
	`start()`/`dispose()` to the owner.
-->
<script setup lang="ts">
import ConsentManager from '@c15t/vue/runtime/components/consent-manager.vue';
import { defineAsyncComponent } from 'vue';

withDefaults(
	defineProps<{
		kind?: 'preferences' | 'iab';
		/** Which IAB preference-centre tab to open on. */
		tab?: 'purposes' | 'vendors';
	}>(),
	{ kind: 'preferences', tab: undefined }
);

// The TCF surface is the larger half of this island and only an IAB site
// ever opens it, so it arrives on its own chunk.
const IABDialogSurface = defineAsyncComponent(
	() => import('./iab-dialog-surface.vue')
);
</script>

<template>
	<IABDialogSurface
		v-if="kind === 'iab'"
		:tab="tab"
	/>
	<ConsentManager v-else />
</template>
