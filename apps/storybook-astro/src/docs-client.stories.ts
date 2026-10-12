import type { Meta, StoryObj } from '@storybook/html-vite';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { callbacks } from './docs-recipes/consent-callbacks';
import ConsentStatus from './docs-recipes/consent-status';
import { renderAstroStory } from './render-astro-story';

/**
 * The client API recipes the Astro docs publish: callbacks from a client
 * entrypoint, and a React island that reads consent from the page runtime.
 */
const meta = {
	parameters: { layout: 'fullscreen' },
	title: 'Docs/Client API',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

/** Accepting fires `onChoiceRecorded` and `onPermissionsChanged` once each. */
export const Callbacks: Story = {
	play: async () => {
		const choices: CustomEvent[] = [];
		const changes: CustomEvent[] = [];
		const onChoice = (event: Event) => choices.push(event as CustomEvent);
		const onChange = (event: Event) => changes.push(event as CustomEvent);
		document.addEventListener('consent:choice', onChoice);
		document.addEventListener('consent:permissions', onChange);
		try {
			const body = within(document.body);
			await userEvent.click(
				await body.findByRole('button', { name: /^accept all$/iu })
			);
			await waitFor(() => {
				expect(choices).toHaveLength(1);
				expect(changes.length).toBeGreaterThan(0);
			});
			expect(choices[0]?.detail.categories.measurement.value).toBe(true);
			const last = changes.at(-1)?.detail;
			expect(last.previous.measurement).toBe(false);
			expect(last.current.measurement).toBe(true);
		} finally {
			document.removeEventListener('consent:choice', onChoice);
			document.removeEventListener('consent:permissions', onChange);
		}
	},
	render: () => renderAstroStory('consent-banner--default', { callbacks }),
};

/** A React island follows the page runtime and opens its dialog. */
export const ReactIsland: Story = {
	play: async () => {
		const body = within(document.body);
		const status = await body.findByTestId('measurement-status');
		expect(status).toHaveTextContent('Measurement is not allowed.');
		await userEvent.click(
			await body.findByRole('button', { name: /^accept all$/iu })
		);
		await waitFor(() => {
			expect(status).toHaveTextContent('Measurement is allowed.');
		});
		await userEvent.click(
			body.getByRole('button', { name: /^change cookie settings$/iu })
		);
		await waitFor(() => {
			expect(body.getByRole('dialog')).toBeVisible();
		});
	},
	render: () => {
		const host = renderAstroStory('consent-banner--default');
		const island = document.createElement('div');
		host.append(island);
		// After the page runtime boots, as an Astro island hydrates.
		setTimeout(() => {
			createRoot(island).render(createElement(ConsentStatus));
		}, 0);
		return host;
	},
};
