import {
	recipeAccepts,
	recipeRejects,
} from '@c15t/conformance/play/docs-recipes';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ConsentDialog, offline } from 'c15t/react';
import type { ConsentProviderOptions } from 'c15t/react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { storybookPolicy } from '../../storybook-consent-policy';
import { RecipePage } from './docs-recipe-page';
import { CookieBanner } from './docs-recipes/compose-banner';
import {
	editableConsentOptions,
	StorybookConsentProvider,
} from './storybook-consent-fixtures';

/**
 * The composed banner on the docs' "Compose your own banner" page: stock
 * compound parts with each policy action rendered as the app's own button
 * through `asChild`. In-memory policy, no analytics.
 */
const ComposedBanner = ({
	options = editableConsentOptions,
}: {
	options?: Partial<ConsentProviderOptions>;
}) => (
	<StorybookConsentProvider options={options}>
		<RecipePage>
			<CookieBanner />
			<ConsentDialog />
		</RecipePage>
	</StorybookConsentProvider>
);

const meta = {
	component: ComposedBanner,
	parameters: { layout: 'fullscreen' },
	title: 'Docs/Compose your own banner',
} satisfies Meta<typeof ComposedBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Each action is the app's button, carrying c15t's action attribute. */
const actionsUseOwnButton: Story['play'] = async () => {
	const body = within(document.body);
	const accept = await body.findByRole('button', { name: /^accept all$/iu });
	await waitFor(() => {
		expect(accept).toBeVisible();
	});
	for (const name of [/^accept all$/iu, /^reject all$/iu, /^customize$/iu]) {
		const button = body.getByRole('button', { name });
		expect(button).toHaveClass('brand-button');
		expect(button).toHaveAttribute('data-action');
		expect(button).toHaveAttribute('type', 'button');
	}
	expect(accept).toHaveAttribute('data-tone', 'solid');
};

/** Customize opens the stock preferences dialog. */
const customizeOpensDialog: Story['play'] = async () => {
	const body = within(document.body);
	await userEvent.click(
		await body.findByRole('button', { name: /^customize$/iu })
	);
	await expect(
		await body.findByRole('switch', { name: /marketing/iu })
	).toBeInTheDocument();
};

const noticeOptions: Partial<ConsentProviderOptions> = {
	...editableConsentOptions,
	mode: offline({
		policyRules: [
			{
				...storybookPolicy,
				id: 'storybook-notice',
				model: 'opt-out',
				prompt: 'notice',
			},
		],
	}),
	presentation: undefined,
};

/** Under a notice the policy asks for the acknowledgement, not accept or reject. */
const noticeDismisses: Story['play'] = async () => {
	const findAction = (action: string) =>
		document.querySelector<HTMLElement>(
			`[data-testid="consent-banner-root"] [data-action="${action}"]`
		);
	await waitFor(() => {
		expect(findAction('dismiss')).not.toBeNull();
	});
	const dismiss = findAction('dismiss');
	expect(dismiss).toHaveClass('brand-button');
	expect(findAction('accept')).toBeNull();
	expect(findAction('reject')).toBeNull();
	if (dismiss) {
		await userEvent.click(dismiss);
	}
	await waitFor(() => {
		expect(
			document.querySelector('[data-testid="consent-banner-root"]')
		).toBeNull();
	});
};

export const ComposedBannerDesign: Story = { play: actionsUseOwnButton };
export const ComposedBannerAccept: Story = { play: recipeAccepts };
export const ComposedBannerReject: Story = { play: recipeRejects };
export const ComposedBannerCustomize: Story = { play: customizeOpensDialog };
export const ComposedBannerNotice: Story = {
	args: { options: noticeOptions },
	play: noticeDismisses,
};
