/**
 * Tests for useConsentDraft + ConsentDraftProvider.
 *
 * Verifies:
 * - draft values start identical to kernel.consents
 * - set() mutates draft only, kernel untouched
 * - isDirty flips correctly
 * - save() commits through kernel.commands.save and reseeds
 * - reset() discards changes
 * - acceptAll / rejectAll
 * - ConsentDraftProvider shares draft across siblings
 * - kernel state changes reseed draft when draft is clean
 */
import { createConsentKernel } from 'c15t/v3';
import type { ReactNode } from 'react';
import { describe, expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { ConsentDraftProvider, useConsentDraft } from '../draft';
import { ConsentProvider } from '../provider';

function wrap(kernel = createConsentKernel()) {
	const Wrapper = ({ children }: { children: ReactNode }) => (
		<ConsentProvider kernel={kernel}>{children}</ConsentProvider>
	);
	return { kernel, Wrapper };
}

function wrapWithProvider(kernel = createConsentKernel()) {
	const Wrapper = ({ children }: { children: ReactNode }) => (
		<ConsentProvider kernel={kernel}>
			<ConsentDraftProvider>{children}</ConsentDraftProvider>
		</ConsentProvider>
	);
	return { kernel, Wrapper };
}

describe('useConsentDraft — basic staging', () => {
	test('initial values match kernel.consents', async () => {
		const { kernel, Wrapper } = wrap();
		kernel.set.consent({ marketing: true });

		function Probe() {
			const draft = useConsentDraft();
			return (
				<div data-testid="vals">
					{JSON.stringify(draft.values)}|{String(draft.isDirty)}
				</div>
			);
		}

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
		const { kernel, Wrapper } = wrap();

		function Probe() {
			const draft = useConsentDraft();
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
				</div>
			);
		}

		const { getByTestId } = await render(
			<Wrapper>
				<Probe />
			</Wrapper>
		);
		await getByTestId('toggle').click();
		await expect.element(getByTestId('draft')).toHaveTextContent('true|true');
		// Kernel is untouched.
		expect(kernel.getSnapshot().consents.marketing).toBe(false);
	});

	test('save() commits draft to kernel + clears dirty', async () => {
		const { kernel, Wrapper } = wrap();

		function Probe() {
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
						data-testid="save"
						onClick={() => void draft.save()}
					>
						save
					</button>
					<span data-testid="dirty">{String(draft.isDirty)}</span>
				</div>
			);
		}

		const { getByTestId } = await render(
			<Wrapper>
				<Probe />
			</Wrapper>
		);
		await getByTestId('setm').click();
		await expect.element(getByTestId('dirty')).toHaveTextContent('true');
		await getByTestId('save').click();
		await expect.element(getByTestId('dirty')).toHaveTextContent('false');
		expect(kernel.getSnapshot().consents.marketing).toBe(true);
		expect(kernel.getSnapshot().hasConsented).toBe(true);
	});

	test('reset() discards draft changes', async () => {
		const { kernel, Wrapper } = wrap();
		kernel.set.consent({ marketing: false });

		function Probe() {
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
		}

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

		function Probe() {
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
		}

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

		function Banner() {
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
		}

		function Dialog() {
			const draft = useConsentDraft();
			return (
				<span data-testid="dialog-val">{String(draft.values.marketing)}</span>
			);
		}

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
		const { kernel, Wrapper } = wrapWithProvider();

		function Probe() {
			const draft = useConsentDraft();
			return <span data-testid="m">{String(draft.values.marketing)}</span>;
		}

		const { getByTestId } = await render(
			<Wrapper>
				<Probe />
			</Wrapper>
		);
		await expect.element(getByTestId('m')).toHaveTextContent('false');

		// External change — simulates another tab saving consent.
		kernel.set.consent({ marketing: true });
		await expect.element(getByTestId('m')).toHaveTextContent('true');
	});
});
