import { getOpenState } from './data-state';

export const PREFERENCE_ITEM_SLOTS = {
	auxiliary: 'preference-item-auxiliary',
	content: 'preference-item-content',
	control: 'preference-item-control',
	header: 'preference-item-header',
	leading: 'preference-item-leading',
	meta: 'preference-item-meta',
	root: 'preference-item-root',
	title: 'preference-item-title',
	trigger: 'preference-item-trigger',
} as const;

/** @internal Animation implementation detail — not part of the public slot API. */
export const PREFERENCE_ITEM_INTERNAL_SLOTS = {
	contentInner: 'preference-item-content-inner',
	contentViewport: 'preference-item-content-viewport',
} as const;

export type PreferenceItemSlot =
	(typeof PREFERENCE_ITEM_SLOTS)[keyof typeof PREFERENCE_ITEM_SLOTS];

export function getPreferenceItemState(open: boolean) {
	return getOpenState(open);
}

export function togglePreferenceItemValue(current: boolean) {
	return !current;
}
