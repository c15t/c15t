import { ConsentBanner } from '@c15t/svelte';
import type { Meta, StoryObj } from '@storybook/svelte-vite';
import { expect, spyOn, userEvent, waitFor, within } from 'storybook/test';
import type { PlayFunction } from 'storybook/types';

import ConsentActions from './docs-examples/consent-actions.svelte';
import { callbacks } from './docs-examples/consent-callbacks';
import ConsentEvents from './docs-examples/consent-events.svelte';
import { i18n } from './docs-examples/consent-i18n';
import ConsentStatus from './docs-examples/consent-status.svelte';
import FloatingTrigger from './docs-examples/floating-trigger.svelte';
import IABSurfaces from './docs-examples/iab-surfaces.svelte';
import { networkBlocker } from './docs-examples/network-blocker';
import OwnPreferences from './docs-examples/own-preferences.svelte';
import PrivacyControls from './docs-examples/privacy-controls.svelte';
import PrivacySettingsPage from './docs-examples/privacy-settings-page.svelte';
import DocsExampleStory from './DocsExampleStory.svelte';

/**
 * The component and getter examples the Svelte and SvelteKit docs publish.
 * Each story renders one file from `docs-examples/` with an in-memory policy
 * and no analytics, and checks the behavior the docs describe.
 */
const meta = {
	component: DocsExampleStory,
	parameters: { layout: 'fullscreen' },
	title: 'Docs/Svelte examples',
} satisfies Meta<DocsExampleStory>;

export default meta;
type Story = StoryObj<typeof meta>;

const body = () => within(document.body);

const measurementSwitch = () =>
	// The measurement category is titled Analytics.
	body().findByRole('switch', { name: /analytics/iu });

const acceptBanner: PlayFunction = async () => {
	await userEvent.click(
		await body().findByRole('button', { name: /^accept all$/iu })
	);
	await waitFor(() => {
		expect(body().queryByRole('button', { name: /^accept all$/iu })).toBeNull();
	});
};

/** The trigger opens the preference dialog. */
export const FloatingTriggerExample: Story = {
	args: { example: FloatingTrigger },
	play: async () => {
		await userEvent.click(await body().findByTestId('consent-dialog-trigger'));
		await expect(
			await body().findByTestId('consent-dialog-root')
		).toBeInTheDocument();
	},
};

/** The widget renders category switches inline. */
export const PrivacySettingsPageExample: Story = {
	args: { example: PrivacySettingsPage },
	play: async () => {
		await expect(await measurementSwitch()).toBeInTheDocument();
		expect(body().getByTestId('consent-widget-root')).toBeInTheDocument();
	},
};

/** Reject records every optional category as denied. */
export const ConsentActionsExample: Story = {
	args: { example: ConsentActions },
	play: async () => {
		await userEvent.click(
			await body().findByRole('button', { name: 'Reject optional' })
		);
		await userEvent.click(
			body().getByRole('button', { name: 'Choose cookies' })
		);
		const measurement = await measurementSwitch();
		await waitFor(() => {
			expect(measurement).toHaveAttribute('aria-checked', 'false');
		});
	},
};

/** A permission and a recorded choice read differently before a choice. */
export const ConsentStatusExample: Story = {
	args: { example: ConsentStatus },
	play: async () => {
		await expect(
			await body().findByTestId('measurement-permission')
		).toHaveTextContent('No');
		expect(body().getByTestId('measurement-choice')).toHaveTextContent(
			'Not chosen'
		);
	},
};

/** Allow analytics records measurement; preferences show it granted. */
export const PrivacyControlsExample: Story = {
	args: { example: PrivacyControls },
	play: async () => {
		await userEvent.click(
			await body().findByRole('button', { name: 'Allow analytics' })
		);
		await userEvent.click(
			body().getByRole('button', { name: 'Privacy settings' })
		);
		const measurement = await measurementSwitch();
		await waitFor(() => {
			expect(measurement).toHaveAttribute('aria-checked', 'true');
		});
	},
};

/** Own markup edits the draft and saves it. */
export const OwnPreferencesExample: Story = {
	args: { example: OwnPreferences },
	play: async () => {
		const marketing = await body().findByRole('checkbox', {
			name: /marketing/iu,
		});
		expect(marketing).not.toBeChecked();
		await userEvent.click(marketing);
		await userEvent.click(
			body().getByRole('button', { name: 'Save preferences' })
		);
		await waitFor(() => {
			expect(
				body().getByRole('checkbox', { name: /marketing/iu })
			).toBeChecked();
		});
	},
};

/** The IAB banner renders for an IAB policy. */
export const IABSurfacesExample: Story = {
	args: { example: IABSurfaces, iab: true },
	play: async () => {
		await expect(
			await body().findByTestId('iab-consent-banner-customize-button')
		).toBeInTheDocument();
	},
};

/** A kernel listener sees the recorded choice. */
export const ConsentEventsExample: Story = {
	args: { example: ConsentEvents, withBanner: true },
	play: async (context) => {
		await acceptBanner(context);
		await waitFor(() => {
			expect(body().getByTestId('last-recorded')).toHaveTextContent(
				'measurement allowed'
			);
		});
	},
};

/** onChoiceRecorded runs for an explicit accept. */
export const CallbacksExample: Story = {
	args: { example: ConsentBanner, options: { callbacks } },
	play: async (context) => {
		const info = spyOn(console, 'info');
		try {
			await acceptBanner(context);
			await waitFor(() => {
				expect(info).toHaveBeenCalledWith(
					'Visitor chose',
					expect.anything(),
					expect.anything()
				);
			});
		} finally {
			info.mockRestore();
		}
	},
};

/** i18n messages replace the bundled copy in offline mode. */
export const TranslationsExample: Story = {
	args: { example: ConsentBanner, options: { i18n } },
	play: async () => {
		await expect(
			await body().findByText('Your privacy on this site')
		).toBeInTheDocument();
		expect(
			body().getByRole('button', { name: 'Reject optional' })
		).toBeInTheDocument();
	},
};

/** A matching fetch fails with 451 while its category is denied. */
export const NetworkBlockerExample: Story = {
	args: { example: ConsentBanner, options: { networkBlocker } },
	play: async () => {
		await body().findByRole('button', { name: /^accept all$/iu });
		const response = await fetch('https://www.google-analytics.com/g/collect');
		expect(response.status).toBe(451);
	},
};
