import type { ConsentSnapshot, ConsentState } from '@c15t/core';
import { describe, expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { page, userEvent } from 'vitest/browser';

import { ComponentFixtureProvider as ConsentProvider } from '~/__tests__/component-fixture-provider';
import { policyFixture } from '~/__tests__/policy-fixture';
import { ConsentWidget } from '~/components/preferences';
import { ConsentBanner } from '~/components/prompt';
import { useConsentDraft } from '~/draft';
import { useSnapshot } from '~/hooks';
import { offline } from '~/transports/offline';

const mixedPolicy = {
	categories: ['measurement', 'marketing'] as const,
	exemptions: {
		measurement: { kind: 'uk-statistics' as const, revision: 'review-1' },
	},
	id: 'uk-mixed',
	match: { countries: ['GB'] },
	model: 'opt-in' as const,
	prompt: 'choice' as const,
	scopeMode: 'strict' as const,
};

const snapshotFrom = (text: string | null): ConsentSnapshot =>
	JSON.parse(text ?? '{}') as ConsentSnapshot;

const State = () => {
	const snapshot = useSnapshot();
	return (
		<output data-testid="mixed-snapshot">{JSON.stringify(snapshot)}</output>
	);
};
const readSnapshot = () =>
	snapshotFrom(
		document.querySelector('[data-testid="mixed-snapshot"]')?.textContent ??
			null
	);

const mountMixed = (
	values = {},
	withBanner = false,
	defaults?: Partial<ConsentState>
) =>
	render(
		<ConsentProvider
			options={{
				consentCategories: ['necessary', 'measurement', 'marketing'],
				mode: offline(),
				persistence: false,
				prefetch: policyFixture(values, {
					...mixedPolicy,
					categories: [...mixedPolicy.categories],
				}),
				presentation: defaults ? { preferences: { defaults } } : undefined,
			}}
		>
			{withBanner ? <ConsentBanner /> : null}
			<ConsentWidget />
			<State />
		</ConsentProvider>
	);

describe('exempt processing preferences', () => {
	test('shows the right to object and saves independent statistics and advertising choices', async () => {
		await mountMixed();
		const measurement = page.getByTestId('consent-widget-switch-measurement');
		const marketing = page.getByTestId('consent-widget-switch-marketing');
		await expect.element(measurement).toHaveAttribute('aria-checked', 'true');
		await expect.element(marketing).toHaveAttribute('aria-checked', 'false');
		await expect
			.element(page.getByTestId('consent-widget-processing-measurement'))
			.toHaveTextContent('You can turn this off at any time.');
		await expect
			.element(page.getByTestId('consent-widget-processing-marketing'))
			.toHaveTextContent('Requires your consent.');
		expect(readSnapshot().explicitChoice).toBeNull();
		expect(readSnapshot().effectivePermissions.measurement).toBe(true);

		await measurement.click();
		await marketing.click();
		// Staging must not authorize advertising or stop running statistics.
		expect(readSnapshot().effectivePermissions.marketing).toBe(false);
		expect(readSnapshot().effectivePermissions.measurement).toBe(true);
		await page.getByTestId('consent-widget-footer-save-button').click();
		await expect
			.poll(
				() => readSnapshot().exemptionPreferences?.categories.measurement?.value
			)
			.toBe(false);
		expect(readSnapshot().explicitChoice?.categories.marketing?.value).toBe(
			true
		);
		expect(
			readSnapshot().explicitChoice?.categories.measurement
		).toBeUndefined();
		expect(readSnapshot().effectivePermissions.measurement).toBe(false);
		expect(readSnapshot().effectivePermissions.marketing).toBe(true);

		await page.getByTestId('consent-widget-footer-accept-all-button').click();
		await expect.element(measurement).toHaveAttribute('aria-checked', 'false');
		expect(
			readSnapshot().exemptionPreferences?.categories.measurement?.value
		).toBe(false);

		await measurement.click();
		await page.getByTestId('consent-widget-footer-save-button').click();
		await expect
			.poll(() => readSnapshot().effectivePermissions.measurement)
			.toBe(true);
		expect(
			readSnapshot().explicitChoice?.categories.measurement
		).toBeUndefined();
	});

	test('allows keyboard objection with an associated processing notice', async () => {
		await mountMixed();
		const control = document.querySelector<HTMLButtonElement>(
			'[data-testid="consent-widget-switch-measurement"]'
		);
		expect(control).not.toBeNull();
		const descriptions =
			control?.getAttribute('aria-describedby')?.split(' ') ?? [];
		expect(
			descriptions.some((id) =>
				document
					.getElementById(id)
					?.textContent?.includes('You can turn this off at any time.')
			)
		).toBe(true);
		control?.focus();
		await userEvent.keyboard('{Space}');
		await expect
			.element(page.getByTestId('consent-widget-switch-measurement'))
			.toHaveAttribute('aria-checked', 'false');
		expect(readSnapshot().effectivePermissions.measurement).toBe(true);
		await page.getByTestId('consent-widget-footer-save-button').click();
		await expect
			.poll(() => readSnapshot().effectivePermissions.measurement)
			.toBe(false);
	});

	test('keeps presentation defaults separate from default exemption permission', async () => {
		await mountMixed({}, false, { marketing: true, measurement: false });
		await expect
			.element(page.getByTestId('consent-widget-switch-measurement'))
			.toHaveAttribute('aria-checked', 'true');
		await expect
			.element(page.getByTestId('consent-widget-switch-marketing'))
			.toHaveAttribute('aria-checked', 'true');
		expect(readSnapshot().effectivePermissions.measurement).toBe(true);
		expect(readSnapshot().effectivePermissions.marketing).toBe(false);
		expect(readSnapshot().explicitChoice).toBeNull();
	});

	test('draft acceptance preserves a staged objection to an exempt vendor', async () => {
		const Draft = () => {
			const draft = useConsentDraft();
			return (
				<>
					<button
						type="button"
						onClick={() => draft.setVendor('statistics', false)}
					>
						Object to vendor
					</button>
					<button
						type="button"
						onClick={() => draft.acceptAll()}
					>
						Accept draft
					</button>
					<button
						type="button"
						onClick={() => draft.save()}
					>
						Save draft
					</button>
					<output data-testid="exempt-vendor-draft">
						{JSON.stringify(draft.vendors)}
					</output>
				</>
			);
		};
		await render(
			<ConsentProvider
				options={{
					consentCategories: ['necessary', 'measurement', 'marketing'],
					mode: offline(),
					persistence: false,
					prefetch: policyFixture(undefined, {
						...mixedPolicy,
						categories: [...mixedPolicy.categories],
					}),
					vendors: [
						{
							category: 'measurement',
							id: 'statistics',
							name: 'Service statistics',
							privacyPolicyUrl: 'https://example.com/privacy',
						},
					],
				}}
			>
				<Draft />
				<State />
			</ConsentProvider>
		);
		await page.getByRole('button', { name: 'Object to vendor' }).click();
		await page.getByRole('button', { name: 'Accept draft' }).click();
		await expect
			.element(page.getByTestId('exempt-vendor-draft'))
			.toHaveTextContent('"statistics":false');
		await page.getByRole('button', { name: 'Save draft' }).click();
		await expect
			.poll(() => readSnapshot().vendorChoice?.denied)
			.toContain('statistics');
	});

	test('discloses exempt statistics on the first-layer banner', async () => {
		await mountMixed({}, true);
		await expect
			.element(page.getByTestId('consent-banner-exemption-notice'))
			.toHaveTextContent(
				'We use service statistics to improve this service without asking for consent.'
			);
		await expect
			.element(page.getByTestId('consent-banner-exemption-notice'))
			.toHaveTextContent('You can turn this off in privacy settings.');
	});

	test('explains a saved enabled exemption preference masked by a privacy signal', async () => {
		await render(
			<ConsentProvider
				options={{
					consentCategories: ['necessary', 'measurement', 'marketing'],
					mode: offline(),
					overrides: { gpc: true },
					persistence: false,
					prefetch: {
						...policyFixture(undefined, {
							...mixedPolicy,
							categories: [...mixedPolicy.categories],
							privacySignals: { gpc: { denyCategories: ['measurement'] } },
						}),
						initialRecords: {
							exemptionPreferences: {
								categories: {
									measurement: { confirmedAt: Date.now(), value: true },
								},
								version: 1,
							},
						},
					},
				}}
			>
				<ConsentWidget />
				<State />
			</ConsentProvider>
		);
		await expect
			.element(page.getByTestId('consent-widget-switch-measurement'))
			.toHaveAttribute('aria-checked', 'true');
		await expect
			.element(page.getByTestId('consent-widget-restriction-measurement'))
			.toHaveTextContent('restricted');
		expect(readSnapshot().effectivePermissions.measurement).toBe(false);
	});

	test('seeds a previous refusal as an objection without presenting it as consent', async () => {
		await mountMixed({ measurement: false });
		await expect
			.element(page.getByTestId('consent-widget-switch-measurement'))
			.toHaveAttribute('aria-checked', 'false');
	});
});
