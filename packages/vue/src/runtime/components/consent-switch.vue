<script
	setup
	lang="ts"
>
import switchStyles from '@c15t/styles/switch.module.css';
import { SwitchRoot, SwitchThumb } from 'reka-ui';
import { useConsentConfig } from '#c15t/composables';

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
		<span :class="switchStyles.track">
			<SwitchThumb :class="switchStyles.thumb" />
		</span>
	</SwitchRoot>
</template>
