/**
 * An `iab` policy in an app that never mounted `<IABProvider>`.
 *
 * The standard banner and dialog do not answer for the IAB model, so the
 * visitor used to see no consent UI at all. They now throw a render error
 * that says what to do, on the server render and in the browser alike.
 *
 * This file must not import `@c15t/react/iab`: loading it marks the app as
 * one that renders IAB. `iab-policy-guard-provider.test.tsx` covers that.
 */
import { MINIMAL_GVL } from '@c15t/conformance';
import type { GlobalVendorList } from '@c15t/core';
import { custom, deferInitGvl, IAB_UNAVAILABLE_ERROR_CODE } from '@c15t/core';
import { writePolicyResolutionWire } from '@c15t/schema/types';
import { Component } from 'react';
import type { ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { ConsentDialog } from '../components/panel';
import { ConsentBanner } from '../components/prompt';
import { missingIABProviderError } from '../hooks/use-iab-policy-guard';
import { offline } from '../index';
import { ConsentProvider } from '../provider';
import { policyFixture } from './policy-fixture';

const GVL = MINIMAL_GVL as unknown as GlobalVendorList;
const MESSAGE = missingIABProviderError().message;
const iabPolicy = () =>
	policyFixture({}, { categories: ['marketing'], model: 'iab' });

/** Keeps the error a surface throws, the way an app's boundary would. */
class Boundary extends Component<
	{ children: ReactNode; onError: (error: Error) => void },
	{ failed: boolean }
> {
	constructor(props: { children: ReactNode; onError: (error: Error) => void }) {
		super(props);
		this.state = { failed: false };
	}

	static getDerivedStateFromError() {
		return { failed: true };
	}

	override componentDidCatch(error: Error) {
		this.props.onError(error);
	}

	override render() {
		return this.state.failed ? null : this.props.children;
	}
}

const mount = async function mount(
	options: Parameters<typeof ConsentProvider>[0]['options'],
	surface: 'banner' | 'dialog' = 'banner'
): Promise<{ errors: Error[] }> {
	const errors: Error[] = [];
	await render(
		<Boundary onError={(error) => errors.push(error)}>
			<ConsentProvider options={{ persistence: false, ...options }}>
				{surface === 'banner' ? <ConsentBanner /> : <ConsentDialog />}
			</ConsentProvider>
		</Boundary>
	);
	return { errors };
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

describe('an `iab` policy without <IABProvider>', () => {
	it.each(['banner', 'dialog'] as const)(
		'throws from the %s for a server prefetch with the vendor list',
		async (surface) => {
			vi.spyOn(console, 'error').mockImplementation(() => undefined);
			const { errors } = await mount(
				{
					mode: custom({}),
					prefetch: {
						...iabPolicy(),
						initialIab: { cmpId: 28, enabled: true, gvl: GVL },
					},
				},
				surface
			);

			expect(errors[0]?.message).toBe(MESSAGE);
			expect((errors[0] as { code?: string }).code).toBe(
				IAB_UNAVAILABLE_ERROR_CODE
			);
		}
	);

	it('throws during the server render too', () => {
		expect(() =>
			renderToString(
				<ConsentProvider
					options={{
						mode: custom({}),
						persistence: false,
						prefetch: {
							...iabPolicy(),
							initialIab: { cmpId: 28, enabled: true, gvl: GVL },
						},
					}}
				>
					<ConsentBanner />
				</ConsentProvider>
			)
		).toThrow(MESSAGE);
	});

	it.each(['reference', 'inline'] as const)(
		'throws once /init sends the vendor list by %s',
		async (gvl) => {
			vi.spyOn(console, 'error').mockImplementation(() => undefined);
			const init = initWith(gvl);
			const { errors } = await mount({
				mode: custom({ init }),
				prefetch: { ...iabPolicy(), initialPolicyPending: true },
			});

			await vi.waitFor(() => {
				expect(errors[0]?.message).toBe(MESSAGE);
				expect((errors[0] as { code?: string }).code).toBe(
					IAB_UNAVAILABLE_ERROR_CODE
				);
			});
		}
	);

	it('shows the standard banner when the backend turns IAB off with `gvl: null`', async () => {
		const init = initWith('null');
		const { errors } = await mount({
			mode: custom({ init }),
			prefetch: { ...iabPolicy(), initialPolicyPending: true },
		});

		await vi.waitFor(() => {
			expect(
				document.querySelector('[data-testid="consent-banner-root"]')
			).not.toBeNull();
		});
		expect(errors).toEqual([]);
	});

	it('shows the standard banner for an offline `iab` rule, which has no vendor list', async () => {
		const { errors } = await mount({
			mode: offline({
				policyRules: [
					{
						categories: ['marketing'],
						id: 'offline-iab',
						match: { fallback: true },
						model: 'iab',
						prompt: 'choice',
						scopeMode: 'permissive',
					},
				],
			}),
		});

		await vi.waitFor(() => {
			expect(
				document.querySelector('[data-testid="consent-banner-root"]')
			).not.toBeNull();
		});
		expect(errors).toEqual([]);
	});

	it('shows the standard banner for a policy that is not IAB', async () => {
		const { errors } = await mount({
			mode: custom({}),
			prefetch: {
				...policyFixture(),
				initialIab: { cmpId: 28, enabled: true, gvl: GVL },
			},
		});

		await vi.waitFor(() => {
			expect(
				document.querySelector('[data-testid="consent-banner-root"]')
			).not.toBeNull();
		});
		expect(errors).toEqual([]);
	});
});
