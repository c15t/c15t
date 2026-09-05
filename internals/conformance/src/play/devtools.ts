import type { PlayFunction } from 'storybook/internal/types';
import { expect, userEvent, waitFor, within } from 'storybook/test';

export const devToolsReady: PlayFunction = async () => {
	await waitFor(() => {
		expect(document.querySelector('[data-c15t-dev-tools]')).not.toBeNull();
	});
};

/** Shared behavior contract for floating and embedded framework adapters. */
export const devToolsFlow: PlayFunction = async (context) => {
	await devToolsReady(context);
	const root = document.querySelector<HTMLElement>('[data-c15t-dev-tools]');
	if (!root) {
		throw new Error('DevTools did not mount');
	}
	const panel = within(root);
	await userEvent.click(panel.getByRole('tab', { name: 'Consents' }));
	expect(panel.getByRole('switch', { name: /Necessary/u })).toBeDisabled();
	expect(panel.queryByRole('switch', { name: /Experience/u })).toBeNull();
	await userEvent.click(panel.getByRole('button', { name: 'Accept all' }));
	await waitFor(() =>
		expect(panel.getByRole('switch', { name: /Measurement/u })).toBeChecked()
	);
	await waitFor(() =>
		expect(panel.getByText('Displayed consents accepted.')).toBeVisible()
	);
	await userEvent.click(panel.getByRole('tab', { name: 'Scripts' }));
	await waitFor(() =>
		expect(panel.getByText('analytics-fixture')).toBeInTheDocument()
	);
	await waitFor(() => {
		const script = panel.getByText('analytics-fixture').closest('details');
		expect(script).not.toBeNull();
		if (script) {
			expect(within(script).getByText('Loaded', { exact: true })).toBeVisible();
		}
	});
	// Tab changes restore keyboard focus on the next frame. Let that finish
	// before moving focus into the filter, as a user would between interactions.
	await waitFor(() =>
		expect(panel.getByRole('tab', { name: 'Scripts' })).toHaveFocus()
	);
	await userEvent.type(
		panel.getByRole('textbox', { name: 'Filter scripts' }),
		'analytics-fixture'
	);
	expect(panel.getByRole('textbox', { name: 'Filter scripts' })).toHaveValue(
		'analytics-fixture'
	);
	expect(panel.queryByText('retained-pixel')).toBeNull();
	await userEvent.clear(panel.getByRole('textbox', { name: 'Filter scripts' }));
	await userEvent.click(panel.getByRole('tab', { name: 'Consents' }));
	await userEvent.click(panel.getByRole('button', { name: 'Reject optional' }));
	await waitFor(() =>
		expect(
			panel.getByRole('switch', { name: /Measurement/u })
		).not.toBeChecked()
	);
	await waitFor(() =>
		expect(
			panel.getByText('Optional displayed consents rejected.')
		).toBeVisible()
	);
	await userEvent.click(panel.getByRole('tab', { name: 'Scripts' }));
	await waitFor(() => {
		const script = panel.getByText('retained-pixel').closest('details');
		expect(script).not.toBeNull();
		if (script) {
			expect(
				within(script).getByText('Retained', { exact: true })
			).toBeVisible();
		}
	});
	await userEvent.click(panel.getByRole('tab', { name: 'Events' }));
	expect(root.textContent).toContain('command:save:completed');
	await userEvent.click(panel.getByRole('button', { name: 'Clear events' }));
	expect(root.textContent).not.toContain('command:save:completed');
	await userEvent.click(panel.getByRole('tab', { name: 'Consents' }));
};
