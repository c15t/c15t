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
