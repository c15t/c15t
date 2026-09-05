import {
	devToolsProviderOptions,
	getDevToolsCategories,
} from '@c15t/conformance/fixtures/devtools';
import { devToolsFlow } from '@c15t/conformance/play/devtools';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { TanStackDevtools } from '@tanstack/react-devtools';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { c15tDevtools } from '../../../packages/react/src/devtools';
import { ConsentProvider } from '../../../packages/react/src/index';

const plugins = [
	c15tDevtools({
		defaultOpen: true,
		getConsentCategories: getDevToolsCategories,
	}),
];
const TanStackExample = () => {
	const [mounted, setMounted] = useState(true);
	return (
		<ConsentProvider options={devToolsProviderOptions}>
			<button
				onClick={() => setMounted((value) => !value)}
				type="button"
			>
				Toggle host
			</button>
			{mounted ? (
				<TanStackDevtools
					config={{ defaultOpen: true }}
					plugins={plugins}
				/>
			) : null}
		</ConsentProvider>
	);
};

const meta = {
	component: TanStackExample,
	parameters: { layout: 'fullscreen' },
	tags: ['devtools'],
	// Deliberately unpaired. Verify integration behavior, not TanStack's appearance.
	title: 'Integrations/TanStack Devtools',
} satisfies Meta<typeof TanStackExample>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ConsentAndScriptsFlow: Story = {
	play: async (context) => {
		await devToolsFlow(context);
		const root = document.querySelector('[data-c15t-dev-tools]');
		expect(root?.classList.contains('c15t-dev-tools--embedded')).toBe(true);
		expect(
			within(document.body).queryByRole('button', {
				name: 'Open c15t DevTools',
			})
		).toBeNull();
		await userEvent.click(
			within(document.body).getByRole('button', { name: 'Toggle host' })
		);
		await waitFor(() =>
			expect(document.querySelector('[data-c15t-dev-tools]')).toBeNull()
		);
		await userEvent.click(
			within(document.body).getByRole('button', { name: 'Toggle host' })
		);
		await waitFor(() =>
			expect(document.querySelectorAll('[data-c15t-dev-tools]')).toHaveLength(1)
		);
	},
};
