/**
 * React's wrapper around `@c15t/core/preference-draft`. The draft rules
 * (seeding, staging, stale, baseline merge, displayed categories) are pinned
 * by the core suite; these tests cover what React adds: subscription through
 * `useSyncExternalStore`, the shared `ConsentDraftProvider`, and the save
 * action the banner uses without loading the draft.
 */
import { useState } from 'react';
import type { ReactNode } from 'react';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import {
	ConsentDraftProvider,
	useConsentDraft,
	useVendorDraft,
} from '../draft';
import { useConsentSaveAction } from '../draft-context';
import { useConsent, useSnapshot } from '../hooks';
import { ConsentProvider } from '../provider';
import { offline } from '../transports/offline';
import { policyFixture } from './policy-fixture';

const Provider = ({
	children,
	options,
}: {
	children: ReactNode;
	options?: Record<string, unknown>;
}) => (
	<ConsentProvider
		options={{
			// A permissive policy offers only what the site declares.
			consentCategories: ['measurement', 'marketing'],
			mode: offline(),
			persistence: false,
			prefetch: policyFixture(),
			...options,
		}}
	>
		{children}
	</ConsentProvider>
);

test('a draft stages without touching the record, re-renders on edits and saves', async () => {
	const Probe = () => {
		const draft = useConsentDraft();
		const recorded = useConsent('marketing');
		return (
			<>
				<button
					onClick={() => draft.set('marketing', true)}
					type="button"
				>
					Stage
				</button>
				<button
					onClick={() => draft.save()}
					type="button"
				>
					Save
				</button>
				<output>
					{JSON.stringify({
						categories: draft.displayedCategories,
						dirty: draft.isDirty,
						draft: draft.values.marketing,
						recorded,
					})}
				</output>
			</>
		);
	};
	const screen = await render(
		<Provider>
			<Probe />
		</Provider>
	);
	await expect
		.element(screen.getByRole('status'))
		.toHaveTextContent(
			'{"categories":["necessary","marketing","measurement"],"dirty":false,"draft":false,"recorded":false}'
		);
	await screen.getByRole('button', { name: 'Stage' }).click();
	await expect
		.element(screen.getByRole('status'))
		.toHaveTextContent('"dirty":true,"draft":true,"recorded":false');
	await screen.getByRole('button', { name: 'Save' }).click();
	await expect
		.element(screen.getByRole('status'))
		.toHaveTextContent('"dirty":false,"draft":true,"recorded":true');
});

test('ConsentDraftProvider shares one draft between siblings', async () => {
	const Stager = () => {
		const draft = useConsentDraft();
		return (
			<button
				onClick={() => draft.set('marketing', true)}
				type="button"
			>
				Stage
			</button>
		);
	};
	const Reader = () => (
		<output>{String(useConsentDraft().values.marketing)}</output>
	);
	const screen = await render(
		<Provider>
			<ConsentDraftProvider>
				<Stager />
				<Reader />
			</ConsentDraftProvider>
		</Provider>
	);
	await expect.element(screen.getByRole('status')).toHaveTextContent('false');
	await screen.getByRole('button', { name: 'Stage' }).click();
	await expect.element(screen.getByRole('status')).toHaveTextContent('true');
});

test('useVendorDraft reports a stale draft and resets it', async () => {
	const vendor = {
		category: 'marketing' as const,
		id: 'meta-pixel',
		name: 'Meta Pixel',
		privacyPolicyUrl: 'https://www.facebook.com/privacy/policy/',
	};
	const Probe = ({ declare }: { declare: () => void }) => {
		const { isDirty, isStale, reset, setVendor, vendors } = useVendorDraft();
		return (
			<>
				<output>
					{JSON.stringify({ dirty: isDirty, stale: isStale, vendors })}
				</output>
				<button
					onClick={() => setVendor('meta-pixel', false)}
					type="button"
				>
					Deny
				</button>
				<button
					onClick={declare}
					type="button"
				>
					Declare vendor
				</button>
				<button
					onClick={reset}
					type="button"
				>
					Reset
				</button>
			</>
		);
	};
	const App = () => {
		const [extra, setExtra] = useState(false);
		return (
			<Provider
				options={{
					vendors: extra
						? [vendor, { ...vendor, id: 'x-pixel', name: 'X Pixel' }]
						: [vendor],
				}}
			>
				<Probe declare={() => setExtra(true)} />
			</Provider>
		);
	};
	const screen = await render(<App />);
	await screen.getByRole('button', { name: 'Deny' }).click();
	await expect
		.element(screen.getByRole('status'))
		.toHaveTextContent(
			'{"dirty":true,"stale":false,"vendors":{"meta-pixel":false}}'
		);
	// A vendor declared under the staged denial changes the set of switches:
	// the hook alone shows that the draft needs review.
	await screen.getByRole('button', { name: 'Declare vendor' }).click();
	await expect
		.element(screen.getByRole('status'))
		.toHaveTextContent('"dirty":true,"stale":true');
	await screen.getByRole('button', { name: 'Reset' }).click();
	await expect
		.element(screen.getByRole('status'))
		.toHaveTextContent(
			'{"dirty":false,"stale":false,"vendors":{"meta-pixel":true,"x-pixel":true}}'
		);
});

test('the save action outside a draft provider saves what a fresh draft shows', async () => {
	// The banner's buttons use this path. It must not need a mounted draft:
	// a custom save loads the draft module on demand and confirms the
	// presentation defaults, a bulk save goes straight to the kernel.
	const Probe = () => {
		const save = useConsentSaveAction();
		const snapshot = useSnapshot();
		const recorded = Object.fromEntries(
			Object.entries(snapshot.explicitChoice?.categories ?? {}).map(
				([category, decision]) => [category, decision?.value]
			)
		);
		return (
			<>
				<button
					onClick={() => save()}
					type="button"
				>
					Save
				</button>
				<button
					onClick={() => save('all')}
					type="button"
				>
					Accept all
				</button>
				<output>{JSON.stringify(recorded)}</output>
			</>
		);
	};
	const screen = await render(
		<Provider
			options={{
				presentation: { preferences: { defaults: { measurement: true } } },
			}}
		>
			<Probe />
		</Provider>
	);
	await screen.getByRole('button', { name: 'Save' }).click();
	await expect
		.element(screen.getByRole('status'))
		.toHaveTextContent('{"marketing":false,"measurement":true}');
	await screen.getByRole('button', { name: 'Accept all' }).click();
	await expect
		.element(screen.getByRole('status'))
		.toHaveTextContent('{"marketing":true,"measurement":true}');
});

test('a bulk save through the shared draft discards its staged edits', async () => {
	const Probe = () => {
		const save = useConsentSaveAction();
		const draft = useConsentDraft();
		return (
			<>
				<button
					onClick={() => draft.set('marketing', true)}
					type="button"
				>
					Stage
				</button>
				<button
					onClick={() => save('none')}
					type="button"
				>
					Reject all
				</button>
				<output>
					{JSON.stringify({
						dirty: draft.isDirty,
						draft: draft.values.marketing,
					})}
				</output>
			</>
		);
	};
	const screen = await render(
		<Provider>
			<ConsentDraftProvider>
				<Probe />
			</ConsentDraftProvider>
		</Provider>
	);
	await screen.getByRole('button', { name: 'Stage' }).click();
	await expect
		.element(screen.getByRole('status'))
		.toHaveTextContent('{"dirty":true,"draft":true}');
	await screen.getByRole('button', { name: 'Reject all' }).click();
	await expect
		.element(screen.getByRole('status'))
		.toHaveTextContent('{"dirty":false,"draft":false}');
});
