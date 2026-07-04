<script
	setup
	lang="ts"
>
import { mergeProps } from 'vue';
import buttonStyles from '@c15t/styles/button.module.css';
import type { ButtonMode, ButtonVariant } from '@c15t/schema/config';
import { useConsentConfig } from '#imports';

withDefaults(
	defineProps<{
		variant?: ButtonVariant;
		mode?: ButtonMode;
		type?: 'button' | 'submit' | 'reset';
	}>(),
	{
		variant: 'primary',
		mode: 'filled',
		type: 'button',
	}
);

const config = useConsentConfig();
</script>

<template>
	<button
		v-bind="mergeProps(
		{
			type,
			'data-testid': 'consent-button',
			'data-variant': variant,
			'data-mode': mode,
		},
		(variant === 'primary'
			? config.components?.button?.primary
			: config.components?.button?.secondary) ?? {},
	)
		"
		:class="buttonStyles.button"
	>
		<slot />
	</button>
</template>
