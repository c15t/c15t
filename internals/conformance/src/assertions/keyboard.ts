import { expect, userEvent, waitFor } from 'storybook/test';

/**
 * Assert that pressing `Escape` dismisses an element matched by `rootTestId`.
 */
export async function assertEscapeDismisses(
	root: ParentNode,
	rootTestId: string
): Promise<void> {
	await userEvent.keyboard('{Escape}');
	await waitFor(() => {
		const target = root.querySelector(`[data-testid="${rootTestId}"]`);
		expect(
			target,
			`expected [data-testid="${rootTestId}"] to be removed on Escape`
		).toBeNull();
	});
}

/**
 * Assert that pressing `Enter` while a button is focused activates it. Use
 * `onActivate` to verify the expected side effect.
 */
export async function assertEnterActivates(
	buttonTestId: string,
	onActivate: () => Promise<void> | void,
	root: ParentNode = document.body
): Promise<void> {
	const button = root.querySelector(
		`[data-testid="${buttonTestId}"]`
	) as HTMLElement | null;
	expect(button, `button [data-testid="${buttonTestId}"]`).not.toBeNull();
	button?.focus();
	await userEvent.keyboard('{Enter}');
	await onActivate();
}

/**
 * Assert that pressing `Space` while a button is focused activates it.
 */
export async function assertSpaceActivates(
	buttonTestId: string,
	onActivate: () => Promise<void> | void,
	root: ParentNode = document.body
): Promise<void> {
	const button = root.querySelector(
		`[data-testid="${buttonTestId}"]`
	) as HTMLElement | null;
	expect(button, `button [data-testid="${buttonTestId}"]`).not.toBeNull();
	button?.focus();
	await userEvent.keyboard(' ');
	await onActivate();
}
