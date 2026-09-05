/** Semantic fixture events mapped to the public kernel event contract. */
export const POLICY_EVENT_NAMES = {
	'choice-recorded': 'choice:recorded',
	'notice-dismissed': 'notice:dismissed',
	'permissions-changed': 'permissions:changed',
	'privacy-opt-out': 'privacy:opt-out',
} as const;

/** Callbacks must be observed through public provider configuration. */
export const EVENT_NAMES = [
	'onChoiceRecorded',
	'onPermissionsChanged',
	'onError',
] as const;
export type EventName = (typeof EVENT_NAMES)[number];
