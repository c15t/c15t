/**
 * Machine-readable DOM contract for every prebuilt component.
 *
 * Each entry maps a component key → DOM/ARIA expectations that every
 * framework must render identically. Used by:
 * - `assertDomContract(container, componentKey)` — runtime assertion helper
 * - `apps/parity-runner` — as the source for cross-framework DOM diffs
 * - `dom-snapshot.ts` — as the list of stable elements to capture
 */

import { TEST_IDS } from './test-ids';

export interface AriaRoleExpectation {
	testId: string;
	/** Expected ARIA `role` (or implicit role via tag). */
	role: string;
	/** Attributes that MUST be present (any value). */
	requiredAttrs?: readonly string[];
	/** Attributes asserted to have an exact value. */
	exactAttrs?: Readonly<Record<string, string>>;
}

export interface FocusContract {
	/** Test-id of the element that receives focus on open. */
	initialFocusTestId: string;
	/**
	 * When closed via keyboard / programmatic close, focus must return to this
	 * test-id (usually the trigger).
	 */
	returnFocusTestId?: string;
	/** Test-ids inside the focus trap, in tab order. */
	tabOrderTestIds: readonly string[];
}

export interface ComponentContract {
	/** Component family key (stable across frameworks). */
	key: string;
	/** Test-id on the root element (queryable even when closed if portal'd). */
	rootTestId: string;
	/** Elements + their required ARIA role/attrs. */
	elements: readonly AriaRoleExpectation[];
	/** Focus contract if this component traps or manages focus. */
	focus?: FocusContract;
	/** Elements that must be present in every locale (no conditional rendering). */
	stableElements: readonly string[];
}

export const DOM_CONTRACT: Readonly<Record<string, ComponentContract>> = {
	consentBanner: {
		key: 'consentBanner',
		rootTestId: TEST_IDS.consentBanner.root,
		elements: [
			{
				testId: TEST_IDS.consentBanner.card,
				role: 'dialog',
				requiredAttrs: ['aria-label'],
				exactAttrs: { 'aria-modal': 'true' },
			},
			{ testId: TEST_IDS.consentBanner.title, role: 'heading' },
			{
				testId: TEST_IDS.consentBanner.acceptButton,
				role: 'button',
				exactAttrs: { type: 'button' },
			},
			{
				testId: TEST_IDS.consentBanner.rejectButton,
				role: 'button',
				exactAttrs: { type: 'button' },
			},
			{
				testId: TEST_IDS.consentBanner.customizeButton,
				role: 'button',
				exactAttrs: { type: 'button' },
			},
		],
		focus: {
			initialFocusTestId: TEST_IDS.consentBanner.card,
			tabOrderTestIds: [
				TEST_IDS.consentBanner.rejectButton,
				TEST_IDS.consentBanner.acceptButton,
				TEST_IDS.consentBanner.customizeButton,
			],
		},
		stableElements: [
			TEST_IDS.consentBanner.root,
			TEST_IDS.consentBanner.card,
			TEST_IDS.consentBanner.title,
			TEST_IDS.consentBanner.description,
			TEST_IDS.consentBanner.acceptButton,
			TEST_IDS.consentBanner.rejectButton,
		],
	},

	consentDialog: {
		key: 'consentDialog',
		rootTestId: TEST_IDS.consentDialog.root,
		elements: [
			{
				testId: TEST_IDS.consentDialog.root,
				role: 'dialog',
				requiredAttrs: ['aria-labelledby'],
				exactAttrs: { 'aria-modal': 'true' },
			},
			{ testId: TEST_IDS.consentDialog.title, role: 'heading' },
			{ testId: TEST_IDS.consentDialog.overlay, role: 'presentation' },
		],
		focus: {
			initialFocusTestId: TEST_IDS.consentDialog.root,
			returnFocusTestId: TEST_IDS.consentDialog.trigger,
			tabOrderTestIds: [],
		},
		stableElements: [
			TEST_IDS.consentDialog.root,
			TEST_IDS.consentDialog.title,
			TEST_IDS.consentDialog.content,
		],
	},

	consentWidget: {
		key: 'consentWidget',
		rootTestId: TEST_IDS.consentWidget.root,
		elements: [
			{ testId: TEST_IDS.consentWidget.root, role: 'group' },
			{ testId: TEST_IDS.consentWidget.accordion, role: 'group' },
			{
				testId: TEST_IDS.consentWidget.footerSaveButton,
				role: 'button',
				exactAttrs: { type: 'button' },
			},
		],
		stableElements: [
			TEST_IDS.consentWidget.root,
			TEST_IDS.consentWidget.accordion,
			TEST_IDS.consentWidget.footerSaveButton,
		],
	},

	iabConsentBanner: {
		key: 'iabConsentBanner',
		rootTestId: TEST_IDS.iabConsentBanner.root,
		elements: [
			{
				testId: TEST_IDS.iabConsentBanner.card,
				role: 'dialog',
				requiredAttrs: ['aria-label'],
				exactAttrs: { 'aria-modal': 'true' },
			},
			{
				testId: TEST_IDS.iabConsentBanner.acceptButton,
				role: 'button',
				exactAttrs: { type: 'button' },
			},
			{
				testId: TEST_IDS.iabConsentBanner.rejectButton,
				role: 'button',
				exactAttrs: { type: 'button' },
			},
			{
				testId: TEST_IDS.iabConsentBanner.customizeButton,
				role: 'button',
				exactAttrs: { type: 'button' },
			},
		],
		stableElements: [
			TEST_IDS.iabConsentBanner.root,
			TEST_IDS.iabConsentBanner.card,
			TEST_IDS.iabConsentBanner.acceptButton,
		],
	},

	iabConsentDialog: {
		key: 'iabConsentDialog',
		rootTestId: TEST_IDS.iabConsentDialog.root,
		elements: [
			{
				testId: TEST_IDS.iabConsentDialog.card,
				role: 'dialog',
				requiredAttrs: ['aria-label'],
				exactAttrs: { 'aria-modal': 'true' },
			},
		],
		focus: {
			initialFocusTestId: TEST_IDS.iabConsentDialog.card,
			tabOrderTestIds: [],
		},
		stableElements: [
			TEST_IDS.iabConsentDialog.root,
			TEST_IDS.iabConsentDialog.card,
		],
	},
} as const;

export const COMPONENT_KEYS = Object.keys(
	DOM_CONTRACT
) as readonly (keyof typeof DOM_CONTRACT)[];
