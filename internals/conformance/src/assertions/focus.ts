import { expect, userEvent, waitFor } from 'storybook/test';

/**
 * Wait until the element matching `testId` receives focus. Useful after
 * opening a dialog / banner where focus moves asynchronously (microtask /
 * animation frame).
 */
export async function assertInitialFocus(
	root: ParentNode,
	testId: string
): Promise<void> {
	await waitFor(() => {
		const target = root.querySelector(`[data-testid="${testId}"]`);
		expect(
			target,
			`element [data-testid="${testId}"] not found`
		).not.toBeNull();
		expect(document.activeElement).toBe(target);
	});
}

/**
 * Assert that after `closeAction` runs, focus returns to the element with
 * `triggerTestId`. Use for testing dialog-close / banner-dismiss flows.
 */
export async function assertFocusReturnsTo(
	root: ParentNode,
	triggerTestId: string,
	closeAction: () => Promise<void>
): Promise<void> {
	await closeAction();
	await waitFor(() => {
		const trigger = root.querySelector(`[data-testid="${triggerTestId}"]`);
		expect(
			trigger,
			`expected trigger [data-testid="${triggerTestId}"] to exist`
		).not.toBeNull();
		expect(document.activeElement).toBe(trigger);
	});
}

/**
 * Walk `Tab` through the expected focus order and assert each stop matches.
 * `orderedTestIds[0]` should already have focus when this is called.
 */
export async function assertTabOrder(
	root: ParentNode,
	orderedTestIds: readonly string[]
): Promise<void> {
	if (orderedTestIds.length === 0) return;

	const first = root.querySelector(`[data-testid="${orderedTestIds[0]}"]`);
	expect(document.activeElement, 'tab-order initial focus').toBe(first);

	for (let i = 1; i < orderedTestIds.length; i++) {
		await userEvent.tab();
		const expected = root.querySelector(`[data-testid="${orderedTestIds[i]}"]`);
		expect(
			document.activeElement,
			`tab stop ${i} should be [data-testid="${orderedTestIds[i]}"]`
		).toBe(expected);
	}
}

/**
 * Assert that `Shift+Tab` from the current focus moves back to the previous
 * element in the order.
 */
export async function assertReverseTabOrder(
	root: ParentNode,
	orderedTestIds: readonly string[]
): Promise<void> {
	for (let i = orderedTestIds.length - 2; i >= 0; i--) {
		await userEvent.tab({ shift: true });
		const expected = root.querySelector(`[data-testid="${orderedTestIds[i]}"]`);
		expect(
			document.activeElement,
			`shift-tab stop ${i} should be [data-testid="${orderedTestIds[i]}"]`
		).toBe(expected);
	}
}

/**
 * Focus trap: assert that Tab from the last element wraps to the first, and
 * Shift+Tab from the first wraps to the last.
 */
export async function assertFocusTrap(
	root: ParentNode,
	orderedTestIds: readonly string[]
): Promise<void> {
	if (orderedTestIds.length < 2) return;
	const last = root.querySelector(
		`[data-testid="${orderedTestIds[orderedTestIds.length - 1]}"]`
	) as HTMLElement | null;
	const first = root.querySelector(
		`[data-testid="${orderedTestIds[0]}"]`
	) as HTMLElement | null;
	expect(last, 'last element in trap').not.toBeNull();
	expect(first, 'first element in trap').not.toBeNull();

	last?.focus();
	await userEvent.tab();
	expect(document.activeElement, 'tab from last wraps to first').toBe(first);

	first?.focus();
	await userEvent.tab({ shift: true });
	expect(document.activeElement, 'shift+tab from first wraps to last').toBe(
		last
	);
}

/**
 * Assert that an element renders a visible keyboard-focus indicator.
 *
 * Focuses the element (in a fresh story with no preceding pointer
 * interaction, script focus matches `:focus-visible` in Chromium), captures
 * its computed outline/box-shadow, blurs, and asserts the indicator styles
 * actually changed — catching regressions where a higher-specificity variant
 * rule crushes the `:focus-visible` ring (e.g. stroke/ghost button modes).
 *
 * Only use this for elements that render the indicator on THEMSELVES
 * (buttons, cards, links). Composite widgets render it elsewhere — the
 * switch rings its `.track` child and the accordion rings the enclosing
 * `.item` via `:has()` — and would false-fail this assertion.
 */
export async function assertVisibleFocusIndicator(
	root: ParentNode,
	testId: string
): Promise<void> {
	const element = root.querySelector(
		`[data-testid="${testId}"]`
	) as HTMLElement | null;
	expect(element, `element [data-testid="${testId}"] not found`).not.toBeNull();
	if (!element) return;

	element.focus();
	expect(document.activeElement, 'element should be focusable').toBe(element);
	expect(
		element.matches(':focus-visible'),
		'focus should be keyboard-visible (no pointer interaction expected before this assertion)'
	).toBe(true);

	const focused = getComputedStyle(element);
	const focusedIndicator = {
		boxShadow: focused.boxShadow,
		outline: `${focused.outlineStyle} ${focused.outlineWidth} ${focused.outlineColor}`,
	};

	element.blur();
	const blurred = getComputedStyle(element);
	const changed =
		blurred.boxShadow !== focusedIndicator.boxShadow ||
		`${blurred.outlineStyle} ${blurred.outlineWidth} ${blurred.outlineColor}` !==
			focusedIndicator.outline;

	expect(
		changed,
		`[data-testid="${testId}"] must render a visible focus indicator (outline or box-shadow must differ from the unfocused state)`
	).toBe(true);
}
