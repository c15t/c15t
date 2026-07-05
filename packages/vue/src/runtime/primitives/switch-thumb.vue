<script setup lang="ts">
import { inject, ref } from 'vue';
import { switchCheckedKey } from './keys';

const checked = inject(switchCheckedKey, ref(false));
</script>

<template>
	<span :data-state="checked ? 'checked' : 'unchecked'">
		<slot />
	</span>
</template>
