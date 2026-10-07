<script setup lang="ts">
/**
 * The consent trigger's icon, shared by the single button and the toolbar's
 * preferences item. Decorative; the control carries the accessible name.
 */
import type { ConsentDialogTriggerIcon } from '@c15t/schema/config';

import ConsentBrandingIcon from './branding-icon.vue';

defineProps<{
	icon?: ConsentDialogTriggerIcon;
	branding?: string;
}>();
</script>

<template>
	<svg
		v-if="icon === 'fingerprint'"
		aria-hidden="true"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
	>
		<path d="M12 12a4 4 0 0 0-4 4" />
		<path d="M12 8a8 8 0 0 0-8 8" />
		<path d="M12 4a12 12 0 0 0-12 12" />
		<path d="M12 12a4 4 0 0 1 4 4" />
		<path d="M12 8a8 8 0 0 1 8 8" />
		<path d="M12 4a12 12 0 0 1 12 12" />
	</svg>
	<svg
		v-else-if="icon === 'settings'"
		aria-hidden="true"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
	>
		<circle
			cx="12"
			cy="12"
			r="3"
		/>
		<path
			d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65
			1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65
			0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65
			1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0
			0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65
			1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65
			0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65
			1.65 0 0 0-.33 1.82v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65
			0 0 0-1.51 1z"
		/>
	</svg>
	<ConsentBrandingIcon
		v-else
		:branding="branding"
	/>
</template>
