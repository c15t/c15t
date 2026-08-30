<script setup lang="ts">
import switchStyles from '@c15t/ui/styles/v3/switch';

import { useConsentConfig } from '#c15t/composables';

import { SwitchRoot, SwitchThumb } from '../primitives';

withDefaults(
	defineProps<{
		disabled?: boolean;
		ariaLabel?: string;
		indeterminate?: boolean;
		size?: 'small' | 'medium';
	}>(),
	{
		size: 'medium',
	}
);

const model = defineModel<boolean>({ default: false });

const config = useConsentConfig();
</script>

<template>
	<SwitchRoot
		v-model="model"
		v-bind="config.components?.switch?.root"
		:disabled="disabled"
		:aria-label="ariaLabel"
		:data-indeterminate="indeterminate ? true : undefined"
		:data-size="size === 'small' ? 'small' : undefined"
		data-testid="consent-switch"
		:class="switchStyles.root"
	>
		<span
			v-bind="config.components?.switch?.track"
			:class="switchStyles.track"
		>
			<SwitchThumb
				v-bind="config.components?.switch?.thumb"
				:class="switchStyles.thumb"
			/>
		</span>
	</SwitchRoot>
</template>
