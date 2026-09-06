<script setup lang="ts">
withDefaults(
	defineProps<{
		width?: string;
		height?: string;
		/** Point the chevron down instead of right. */
		expanded?: boolean;
	}>(),
	{ expanded: false, height: undefined, width: undefined }
);
</script>

<template>
	<svg
		:width="width"
		:height="height"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
	>
		<path
			v-if="expanded"
			d="M19 9l-7 7-7-7"
		/>
		<path
			v-else
			d="M9 5l7 7-7 7"
		/>
	</svg>
</template>
