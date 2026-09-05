import { expect, userEvent, waitFor, within } from 'storybook/test';
import type { PlayFunction } from 'storybook/types';

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
	await userEvent.click(
		panel.getByRole('tab', { exact: true, name: 'Consents' })
	);
	expect(panel.getByRole('switch', { name: /Necessary/u })).toBeDisabled();
	expect(panel.queryByRole('switch', { name: /Experience/u })).toBeNull();
	await userEvent.click(
		panel.getByRole('button', { exact: true, name: 'Accept all' })
	);
	await waitFor(() =>
		expect(panel.getByRole('switch', { name: /Measurement/u })).toBeChecked()
	);
	await userEvent.click(
		panel.getByRole('tab', { exact: true, name: 'Scripts' })
	);
	await waitFor(() =>
		expect(panel.getByText('analytics-fixture')).toBeInTheDocument()
	);
	await waitFor(() => expect(root.textContent).toContain('loaded'));
	await userEvent.type(
		panel.getByRole('textbox', { name: 'Filter scripts' }),
		'analytics-fixture'
	);
	expect(panel.queryByText('retained-pixel')).toBeNull();
	await userEvent.clear(panel.getByRole('textbox', { name: 'Filter scripts' }));
	await userEvent.click(
		panel.getByRole('tab', { exact: true, name: 'Consents' })
	);
	await userEvent.click(panel.getByRole('button', { name: 'Reject optional' }));
	await waitFor(() =>
		expect(
			panel.getByRole('switch', { name: /Measurement/u })
		).not.toBeChecked()
	);
	await userEvent.click(
		panel.getByRole('tab', { exact: true, name: 'Scripts' })
	);
	await waitFor(() => expect(root.textContent).toContain('retained'));
	await userEvent.click(
		panel.getByRole('tab', { exact: true, name: 'Events' })
	);
	expect(root.textContent).toContain('command:save:completed');
	await userEvent.click(panel.getByRole('button', { name: 'Clear events' }));
	expect(root.textContent).not.toContain('command:save:completed');
	await userEvent.click(
		panel.getByRole('tab', { exact: true, name: 'Consents' })
	);
};
