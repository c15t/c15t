<script setup lang="ts">
import { inject } from 'vue';

import { dialogContextKey } from './keys';

const dialog = inject(dialogContextKey);
</script>

<template>
	<Teleport to="body">
		<template v-if="dialog?.open()">
			<slot />
		</template>
	</Teleport>
</template>
