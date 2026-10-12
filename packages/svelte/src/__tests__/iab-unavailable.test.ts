/**
 * An `iab` policy under a provider without `iab`.
 *
 * The standard banner does not handle the IAB model and no CMP answers for
 * it, so the visitor would get no working consent UI. The provider throws
 * an `IABUnavailableError` from its render instead. `iab-unavailable.ssr.test.ts`
 * covers the server render.
 */
import { MINIMAL_GVL } from '@c15t/conformance/fixtures/gvl';
import { custom, deferInitGvl, IAB_UNAVAILABLE_ERROR_CODE } from '@c15t/core';
import type { GlobalVendorList } from '@c15t/core';
import { writePolicyResolutionWire } from '@c15t/schema/types';
import type { PolicyResolution } from '@c15t/schema/types';
import { render } from '@testing-library/svelte';
import { afterEach, describe, expect, test, vi } from 'vitest';

import type { ConsentManagerOptions } from '../lib/types';
import Fixture from './fixtures/iab-guard-fixture.svelte';
import { policyFixture } from './policy-fixture';

const GVL = MINIMAL_GVL as unknown as GlobalVendorList;
const MESSAGE =
	"c15t: this visitor's policy uses IAB TCF, but `iab` is not set. Set `iab` on <ConsentProvider> and render <IABConsentBanner>, or remove the IAB model from your policy.";

const iabPolicy = () =>
	policyFixture({}, { categories: ['marketing'], model: 'iab' }) as ReturnType<
		typeof policyFixture
	> & {
		initialPolicyResolution: Extract<PolicyResolution, { status: 'matched' }>;
	};

const initWith = (gvl: 'inline' | 'reference' | 'null') => {
	const body = {
		cmpId: 28,
		gvl: gvl === 'null' ? null : GVL,
		policyResolution: writePolicyResolutionWire(
			iabPolicy().initialPolicyResolution
		),
	};
	return vi.fn(() =>
		Promise.resolve(
			gvl === 'reference'
				? deferInitGvl(body as never, 'https://consent.example.com/gvl')
				: body
		)
	);
};

const views: { unmount: () => void }[] = [];

const mount = function mount(options: Partial<ConsentManagerOptions>) {
	const errors: unknown[] = [];
	views.push(
		render(Fixture, {
			onError: (error: unknown) => errors.push(error),
			options: {
				consentCategories: ['necessary', 'marketing'],
				disableAnimation: true,
				mode: custom({}),
				persistence: false,
				...options,
			} as ConsentManagerOptions,
		})
	);
	return errors;
};

const expectUnavailable = (error: unknown) => {
	expect((error as Error).message).toBe(MESSAGE);
	expect((error as { code?: string }).code).toBe(IAB_UNAVAILABLE_ERROR_CODE);
};

afterEach(() => {
	for (const view of views.splice(0)) {
		view.unmount();
	}
	(window as { __tcfapi?: unknown }).__tcfapi = undefined;
});

describe('an `iab` policy under a provider without `iab`', () => {
	test('throws for a server prefetch with the vendor list', () => {
		const errors = mount({
			prefetch: {
				...iabPolicy(),
				initialIab: { cmpId: 28, enabled: true, gvl: GVL },
			},
		});

		expect(errors).toHaveLength(1);
		expectUnavailable(errors[0]);
	});

	test.each(['inline', 'reference'] as const)(
		'throws once /init sends the vendor list by %s',
		async (gvl) => {
			const errors = mount({
				mode: custom({ init: initWith(gvl) } as never),
				prefetch: { ...iabPolicy(), initialPolicyPending: true },
			});

			await vi.waitFor(() => {
				expect(errors).toHaveLength(1);
			});
			expectUnavailable(errors[0]);
		}
	);

	test('shows the standard banner when the backend turns IAB off with `gvl: null`', async () => {
		const errors = mount({
			mode: custom({ init: initWith('null') } as never),
			prefetch: { ...iabPolicy(), initialPolicyPending: true },
		});

		await vi.waitFor(() => {
			expect(
				document.querySelector('[data-testid="consent-banner-root"]')
			).not.toBeNull();
		});
		expect(errors).toEqual([]);
	});

	test('shows the standard banner for a policy that is not IAB', () => {
		const errors = mount({
			prefetch: {
				...policyFixture(),
				initialIab: { cmpId: 28, enabled: true, gvl: GVL },
			},
		});

		expect(
			document.querySelector('[data-testid="consent-banner-root"]')
		).not.toBeNull();
		expect(errors).toEqual([]);
	});

	test('renders the IAB banner when `iab` is set', async () => {
		const errors = mount({
			iab: { cmpId: 28 },
			prefetch: {
				...iabPolicy(),
				initialIab: { cmpId: 28, enabled: true, gvl: GVL },
			},
		});

		await vi.waitFor(() => {
			expect(
				document.querySelector('[data-testid="iab-consent-banner-root"]')
			).not.toBeNull();
		});
		expect(errors).toEqual([]);
	});
});
