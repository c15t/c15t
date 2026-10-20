import { describe, expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';

import { SupportChat } from '../../../../examples/showcase-gated-embeds/components/support-chat';
import { useVendorAllowed } from '../hooks';
import { useKernel } from '../kernel-selector';
import { offline } from '../transports/offline';
import { ComponentFixtureProvider } from './component-fixture-provider';
import { policyFixture } from './policy-fixture';

const SavedChoice = () => {
	const kernel = useKernel();
	const allowed = useVendorAllowed('crisp');
	return (
		<>
			<button
				type="button"
				onClick={async () => {
					await kernel.commands.save(
						{ functionality: true },
						{ vendors: { crisp: false } }
					);
				}}
			>
				Deny Crisp
			</button>
			<output data-testid="crisp-allowed">{String(allowed)}</output>
		</>
	);
};

describe('showcase support chat', () => {
	test('does not offer Open chat while Crisp is denied and Functionality is allowed', async () => {
		render(
			<ComponentFixtureProvider
				options={{
					consentCategories: ['necessary', 'functionality'],
					mode: offline({ acknowledgeNoRecords: true }),
					persistence: false,
					prefetch: policyFixture(
						{ functionality: true },
						{
							categories: ['functionality'],
							id: 'showcase-chat',
							model: 'opt-in',
							prompt: 'choice',
						}
					),
					scripts: [
						{
							category: 'functionality',
							id: 'crisp',
							src: 'https://example.invalid/crisp.js',
							vendor: 'crisp',
							vendorDetails: {
								name: 'Crisp',
								privacyPolicyUrl: 'https://crisp.chat/en/privacy/',
							},
						},
					],
				}}
			>
				<SupportChat />
				<SavedChoice />
			</ComponentFixtureProvider>
		);
		await expect
			.element(page.getByRole('button', { name: 'Open chat' }))
			.toBeVisible();
		await page.getByRole('button', { name: 'Deny Crisp' }).click();
		await expect
			.element(page.getByTestId('crisp-allowed'))
			.toHaveTextContent('false');
		await expect
			.element(
				page.getByText('Crisp is switched off in your Privacy settings.')
			)
			.toBeVisible();
		await expect
			.element(page.getByRole('button', { name: 'Open chat' }))
			.not.toBeInTheDocument();
	});
});
