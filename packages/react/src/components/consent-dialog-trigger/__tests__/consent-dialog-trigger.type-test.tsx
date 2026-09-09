import type {
	ConsentDialogTriggerProps,
	ConsentDialogTriggerToolbarProps,
} from '../types';

export const triggerProps = {
	icon: 'fingerprint',
	onClick: () => undefined,
} satisfies ConsentDialogTriggerProps;

export const toolbarProps = {
	actions: [
		{
			icon: 'settings',
			id: 'theme',
			label: 'Use dark theme',
			onSelect: () => undefined,
			pressed: false,
		},
	],
	orientation: 'vertical',
	preferences: {
		label: 'Manage privacy settings',
	},
} satisfies ConsentDialogTriggerToolbarProps;

export const invalidTriggerProps: ConsentDialogTriggerProps = {
	// @ts-expect-error Toolbar actions are not part of the existing trigger API.
	actions: toolbarProps.actions,
};

export const invalidToolbarProps: ConsentDialogTriggerToolbarProps = {
	// @ts-expect-error The toolbar has a separate preferences action, not a trigger icon.
	icon: 'fingerprint',
};
