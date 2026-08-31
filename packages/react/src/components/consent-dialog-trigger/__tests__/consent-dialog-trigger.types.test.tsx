import { describe, expect, test } from 'vitest';

import type {
	ConsentDialogTriggerProps,
	ConsentDialogTriggerToolbarProps,
} from '../types';

const triggerProps = {
	icon: 'fingerprint',
	onClick: () => undefined,
} satisfies ConsentDialogTriggerProps;

const toolbarProps = {
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

const invalidTriggerProps: ConsentDialogTriggerProps = {
	// @ts-expect-error Toolbar actions are not part of the existing trigger API.
	actions: toolbarProps.actions,
};

const invalidToolbarProps: ConsentDialogTriggerToolbarProps = {
	// @ts-expect-error The toolbar has a separate preferences action, not a trigger icon.
	icon: 'fingerprint',
};

describe('consent dialog trigger types', () => {
	test('keeps the trigger and toolbar APIs separate', () => {
		expect(triggerProps.icon).toBe('fingerprint');
		expect(toolbarProps.orientation).toBe('vertical');
		expect(invalidTriggerProps).toBeDefined();
		expect(invalidToolbarProps).toBeDefined();
	});
});
