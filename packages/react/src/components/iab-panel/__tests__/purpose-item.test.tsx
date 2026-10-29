/**
 * Google ad tech providers can be the only partners of a purpose they need,
 * so a purpose row counts and lists them with its vendors.
 */
import styles from '@c15t/ui/styles/components/iab-consent-dialog';
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

import { ComponentFixtureProvider as ConsentProvider } from '~/__tests__/component-fixture-provider';
import { offline } from '~/transports/offline';

import { PurposeItem } from '../atoms/purpose-item';

const providerOnlyPurpose = {
	adTechProviders: [
		{ id: 89, name: 'Meta', policyUrl: 'https://meta.example/p' },
		{ id: 2677, name: 'Seedtag', policyUrl: 'https://seedtag.example/p' },
	],
	description: 'Create profiles for personalised advertising',
	id: 3,
	illustrations: [],
	name: 'Create profiles',
	neededByAdTechProviders: true,
	vendors: [],
};

describe('PurposeItem with Google ad tech providers', () => {
	test('leaves stock classes off the provider rows under noStyle', async () => {
		const screen = await render(
			<ConsentProvider
				options={{
					mode: offline({ acknowledgeNoRecords: true }),
					noStyle: true,
				}}
			>
				<PurposeItem
					purpose={providerOnlyPurpose}
					isEnabled={false}
					onToggle={vi.fn()}
					vendorConsents={{}}
					onVendorToggle={vi.fn()}
					onVendorClick={vi.fn()}
				/>
			</ConsentProvider>
		);

		await userEvent.click(screen.getByText('Create profiles'));
		await userEvent.click(screen.getByText(/Partners Using This Purpose/u));
		const link = screen.getByRole('link', { name: 'Seedtag' });
		await expect.element(link).toBeInTheDocument();
		const stock = [
			styles.vendorSectionTitle,
			styles.vendorRow,
			styles.vendorInfo,
			styles.vendorName,
		];
		for (const className of stock) {
			expect(
				screen.container.querySelector(`.${CSS.escape(className)}`)
			).toBeNull();
		}
	});

	test('counts and lists providers as partners of a purpose no vendor declares', async () => {
		const screen = await render(
			<ConsentProvider
				options={{ mode: offline({ acknowledgeNoRecords: true }) }}
			>
				<PurposeItem
					purpose={providerOnlyPurpose}
					isEnabled={false}
					onToggle={vi.fn()}
					vendorConsents={{}}
					onVendorToggle={vi.fn()}
					onVendorClick={vi.fn()}
				/>
			</ConsentProvider>
		);

		await expect.element(screen.getByText('2 partners')).toBeInTheDocument();
		await userEvent.click(screen.getByText('Create profiles'));
		await userEvent.click(screen.getByText(/Partners Using This Purpose/u));
		await expect
			.element(screen.getByText(/Partners Using This Purpose \(2\)/u))
			.toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'Seedtag' }))
			.toHaveAttribute('href', 'https://seedtag.example/p');
	});
});
