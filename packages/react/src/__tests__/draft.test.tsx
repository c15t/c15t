/**
 * Tests for useConsentDraft + ConsentDraftProvider.
 *
 * Verifies:
 * - draft values start identical to kernel.effectivePermissions
 * - set() mutates draft only, kernel untouched
 * - isDirty flips correctly
 * - save() commits through kernel.commands.save and reseeds
 * - reset() discards changes
 * - acceptAll / rejectAll
 * - ConsentDraftProvider shares draft across siblings
 * - kernel state changes reseed draft when draft is clean
 */
import type { AllConsentNames } from '@c15t/core';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { describe, expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { ConsentDraftProvider, useConsentDraft } from '../draft';
import { useConsent, useSaveConsents, useSnapshot } from '../hooks';
import { ConsentProvider } from '../provider';
import { offline } from '../transports/offline';
import { policyFixture } from './policy-fixture';

const wrap = function wrap(options = {}) {
	const Wrapper = ({ children }: { children: ReactNode }) => (
		<ConsentProvider
			options={{
				mode: offline(),
				persistence: false,
				prefetch: policyFixture(),
				...options,
			}}
		>
			{children}
		</ConsentProvider>
	);
	return { Wrapper };
};

const wrapWithProvider = function wrapWithProvider(options = {}) {
	const Wrapper = ({ children }: { children: ReactNode }) => (
		<ConsentProvider
			options={{
				mode: offline(),
				persistence: false,
				prefetch: policyFixture(),
				...options,
			}}
		>
			<ConsentDraftProvider>{children}</ConsentDraftProvider>
		</ConsentProvider>
	);
	return { Wrapper };
};

describe('useConsentDraft — basic staging', () => {
	test('initial values match kernel.effectivePermissions', async () => {
		const { Wrapper } = wrap({
			prefetch: policyFixture({ marketing: true }),
		});

		const Probe = () => {
			const draft = useConsentDraft();
			return (
				<div data-testid="vals">
					{JSON.stringify(draft.values)}|{String(draft.isDirty)}
				</div>
			);
		};

		const { getByTestId } = await render(
			<Wrapper>
				<Probe />
			</Wrapper>
		);
		await expect
			.element(getByTestId('vals'))
			.toHaveTextContent('"marketing":true');
		await expect.element(getByTestId('vals')).toHaveTextContent('|false');
	});

	test('set() mutates draft without touching kernel', async () => {
		const { Wrapper } = wrap();

		const Probe = () => {
			const draft = useConsentDraft();
			const kernelMarketing = useConsent('marketing');
			return (
				<div>
					<button
						type="button"
						data-testid="toggle"
						onClick={() => draft.set('marketing', true)}
					>
						toggle
					</button>
					<span data-testid="draft">
						{String(draft.values.marketing)}|{String(draft.isDirty)}
					</span>
					<span data-testid="kernel">{String(kernelMarketing)}</span>
				</div>
			);
		};

		const { getByTestId } = await render(
			<Wrapper>
				<Probe />
			</Wrapper>
		);
		await getByTestId('toggle').click();
		await expect.element(getByTestId('draft')).toHaveTextContent('true|true');
		// Kernel is untouched.
		await expect.element(getByTestId('kernel')).toHaveTextContent('false');
	});

	test('save() commits draft to kernel + clears dirty', async () => {
		const { Wrapper } = wrap();

		const Probe = () => {
			const draft = useConsentDraft();
			const kernelMarketing = useConsent('marketing');
			const hasConsented = useConsent('necessary');
			return (
				<div>
					<button
						type="button"
						data-testid="setm"
						onClick={() => draft.set('marketing', true)}
					>
						setm
					</button>
					<button
						type="button"
						data-testid="save"
						onClick={async () => {
							await draft.save();
						}}
					>
						save
					</button>
					<span data-testid="dirty">{String(draft.isDirty)}</span>
					<span data-testid="kernel">{String(kernelMarketing)}</span>
					<span data-testid="necessary">{String(hasConsented)}</span>
				</div>
			);
		};

		const { getByTestId } = await render(
			<Wrapper>
				<Probe />
			</Wrapper>
		);
		await getByTestId('setm').click();
		await expect.element(getByTestId('dirty')).toHaveTextContent('true');
		await getByTestId('save').click();
		await expect.element(getByTestId('dirty')).toHaveTextContent('false');
		await expect.element(getByTestId('kernel')).toHaveTextContent('true');
	});

	test('reset() discards draft changes', async () => {
		const { Wrapper } = wrap({
			prefetch: { initialDraft: { marketing: false } },
		});

		const Probe = () => {
			const draft = useConsentDraft();
			return (
				<div>
					<button
						type="button"
						data-testid="setm"
						onClick={() => draft.set('marketing', true)}
					>
						setm
					</button>
					<button
						type="button"
						data-testid="reset"
						onClick={() => draft.reset()}
					>
						reset
					</button>
					<span data-testid="m">{String(draft.values.marketing)}</span>
					<span data-testid="d">{String(draft.isDirty)}</span>
				</div>
			);
		};

		const { getByTestId } = await render(
			<Wrapper>
				<Probe />
			</Wrapper>
		);
		await getByTestId('setm').click();
		await expect.element(getByTestId('m')).toHaveTextContent('true');
		await getByTestId('reset').click();
		await expect.element(getByTestId('m')).toHaveTextContent('false');
		await expect.element(getByTestId('d')).toHaveTextContent('false');
	});

	test('acceptAll / rejectAll', async () => {
		const { Wrapper } = wrap();

		const Probe = () => {
			const draft = useConsentDraft();
			return (
				<div>
					<button
						type="button"
						data-testid="accept"
						onClick={() => draft.acceptAll()}
					>
						accept
					</button>
					<button
						type="button"
						data-testid="reject"
						onClick={() => draft.rejectAll()}
					>
						reject
					</button>
					<span data-testid="m">{String(draft.values.marketing)}</span>
					<span data-testid="n">{String(draft.values.necessary)}</span>
				</div>
			);
		};

		const { getByTestId } = await render(
			<Wrapper>
				<Probe />
			</Wrapper>
		);

		await getByTestId('accept').click();
		await expect.element(getByTestId('m')).toHaveTextContent('true');

		await getByTestId('reject').click();
		await expect.element(getByTestId('m')).toHaveTextContent('false');
		// necessary always stays true after rejectAll
		await expect.element(getByTestId('n')).toHaveTextContent('true');
	});
});

describe('ConsentDraftProvider — shared draft across siblings', () => {
	test('two components see the same draft state', async () => {
		const { Wrapper } = wrapWithProvider();

		const Banner = () => {
			const draft = useConsentDraft();
			return (
				<button
					type="button"
					data-testid="banner-set"
					onClick={() => draft.set('marketing', true)}
				>
					set from banner
				</button>
			);
		};

		const Dialog = () => {
			const draft = useConsentDraft();
			return (
				<span data-testid="dialog-val">{String(draft.values.marketing)}</span>
			);
		};

		const { getByTestId } = await render(
			<Wrapper>
				<Banner />
				<Dialog />
			</Wrapper>
		);

		await expect.element(getByTestId('dialog-val')).toHaveTextContent('false');
		await getByTestId('banner-set').click();
		await expect.element(getByTestId('dialog-val')).toHaveTextContent('true');
	});
});

describe('useConsentDraft — reseeds on external kernel change when clean', () => {
	test('external kernel mutation reseeds draft when draft is clean', async () => {
		const { Wrapper } = wrapWithProvider();

		const Probe = () => {
			const draft = useConsentDraft();
			const setConsent = useSaveConsents();
			return (
				<>
					<button
						type="button"
						data-testid="external"
						onClick={() => setConsent({ marketing: true })}
					>
						external
					</button>
					<span data-testid="m">{String(draft.values.marketing)}</span>
				</>
			);
		};

		const { getByTestId } = await render(
			<Wrapper>
				<Probe />
			</Wrapper>
		);
		await expect.element(getByTestId('m')).toHaveTextContent('false');

		// External change — simulates another tab saving consent.
		await getByTestId('external').click();
		await expect.element(getByTestId('m')).toHaveTextContent('true');
	});
});

test('drafts use configured categories and require review when the displayed scope changes', async () => {
	const Probe = ({ expand }: { expand: () => void }) => {
		const draft = useConsentDraft();
		const snapshot = useSnapshot();
		return (
			<>
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
				<button
					type="button"
					onClick={() => draft.rejectAll()}
				>
					Reject draft
				</button>
				<button
					type="button"
					onClick={expand}
				>
					Add marketing
				</button>
				<button
					type="button"
					onClick={() => draft.reset()}
				>
					Reset draft
				</button>
				<output>
					{JSON.stringify({
						categories: draft.displayedCategories,
						choice: snapshot.explicitChoice,
						stale: draft.isStale,
					})}
				</output>
			</>
		);
	};
	const App = () => {
		const [categories, setCategories] = useState<AllConsentNames[]>([
			'necessary',
			'measurement',
		]);
		return (
			<ConsentProvider
				options={{
					consentCategories: categories,
					mode: offline(),
					persistence: false,
					prefetch: policyFixture(),
				}}
			>
				<Probe
					expand={() =>
						setCategories(['necessary', 'measurement', 'marketing'])
					}
				/>
			</ConsentProvider>
		);
	};
	const screen = await render(<App />);
	await expect
		.element(screen.getByRole('status'))
		.toHaveTextContent('"categories":["necessary","measurement"]');
	await screen.getByRole('button', { name: 'Accept draft' }).click();
	await screen.getByRole('button', { name: 'Save draft' }).click();
	await expect
		.element(screen.getByRole('status'))
		.toHaveTextContent('"measurement":{"basis"');
	await expect
		.element(screen.getByRole('status'))
		.not.toHaveTextContent('"marketing"');
	// Stage an unsaved change before expanding the configured list.
	await screen.getByRole('button', { name: 'Reject draft' }).click();
	await screen.getByRole('button', { name: 'Add marketing' }).click();
	await expect
		.element(screen.getByRole('status'))
		.toHaveTextContent('"stale":true');
	await screen.getByRole('button', { name: 'Reset draft' }).click();
	await expect
		.element(screen.getByRole('status'))
		.toHaveTextContent('"categories":["necessary","marketing","measurement"]');
});
