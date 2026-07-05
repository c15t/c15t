<script setup lang="ts" generic="T extends string">
import actionStyles from '@c15t/ui/styles/v3/consent-actions.module.css';
import { computed } from 'vue';
import ConsentButton from './consent-button.vue';

type ConsentActionsDirection = 'row' | 'column';
type ConsentActionsProfile = 'compact' | 'balanced' | 'strict';
type ActionGroup = T | T[];

const props = withDefaults(
	defineProps<{
		actions?: T[];
		layout?: ActionGroup[];
		direction?: ConsentActionsDirection;
		uiProfile?: ConsentActionsProfile;
		primaryActions?: T[];
		labels?: Partial<Record<T, string>>;
		rootAttrs?: object;
		groupAttrs?: object;
		disabled?: boolean;
		secondaryMode?: 'stroke' | 'filled';
	}>(),
	{
		direction: 'row',
		uiProfile: 'compact',
		secondaryMode: 'filled',
	},
);

const emit = defineEmits<{
	action: [action: T];
}>();

const actionGroups = computed<T[][]>(() => {
	if (props.layout && props.layout.length > 0) {
		return props.layout.map((group) =>
			Array.isArray(group) ? group : [group],
		);
	}
	if (props.actions && props.actions.length > 0) {
		return [props.actions];
	}
	return [];
});

const resolvedDirection = computed<ConsentActionsDirection>(() =>
	props.direction === 'column' ? 'column' : 'row',
);

const isSplitLayout = computed(() => actionGroups.value.length > 1);

const shouldFill = computed(() => {
	const groups = actionGroups.value;
	const actionCount = new Set(groups.flat()).size;
	const isColumn = resolvedDirection.value === 'column';

	if (props.uiProfile === 'strict') {
		return true;
	}
	if (props.uiProfile === 'balanced' && actionCount <= 2) {
		return true;
	}
	if (
		props.uiProfile === 'balanced' &&
		actionCount === 3 &&
		(isSplitLayout.value || isColumn)
	) {
		return true;
	}
	return false;
});

function isPrimary(action: T) {
	if (props.primaryActions && props.primaryActions.length > 0) {
		return props.primaryActions.includes(action);
	}
	return (
		actionGroups.value.flat().includes('customize' as T) &&
		action === ('customize' as T)
	);
}

function actionLabel(action: T) {
	return props.labels?.[action] ?? String(action);
}

function buttonMode(action: T) {
	if (String(action) === 'reject') {
		return 'stroke';
	}
	if (isPrimary(action)) {
		return 'filled';
	}
	return props.secondaryMode;
}
</script>

<template>
	<div
		v-bind="rootAttrs"
		data-testid="consent-actions"
		:class="actionStyles.actionRoot"
		:data-direction="resolvedDirection"
		:data-fill="shouldFill ? true : undefined"
		:data-split="isSplitLayout && !shouldFill ? true : undefined"
	>
		<div
			v-for="(group, groupIndex) in actionGroups"
			:key="`group-${group.join('-') || groupIndex}`"
			v-bind="groupAttrs"
			:class="actionStyles.actionGroup"
			:data-direction="resolvedDirection"
			:data-fill="shouldFill ? true : undefined"
		>
			<ConsentButton
				v-for="action in group"
				:key="action"
				:variant="isPrimary(action) ? 'primary' : 'neutral'"
				:mode="buttonMode(action)"
				:disabled="disabled"
				:data-action="action"
				:data-testid="`consent-actions-${action}-button`"
				@click="emit('action', action)"
			>
				{{ actionLabel(action) }}
			</ConsentButton>
		</div>
	</div>
</template>
