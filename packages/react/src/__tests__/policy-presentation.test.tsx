import type { ConsentKernel, KernelConfig } from '@c15t/core';
import { custom } from '@c15t/core';
import {
	normalizePolicyRule,
	createPolicyRuleFingerprints,
} from '@c15t/schema/types';
import type { PolicyResolution, PolicyRule } from '@c15t/schema/types';
import { useContext, useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { ConsentBanner } from '../components/consent-banner';
import { ConsentDialog } from '../components/consent-dialog';
import { ConsentDialogTrigger } from '../components/consent-dialog-trigger';
import { KernelContext } from '../context';
import { ConsentDraftProvider, useConsentDraft } from '../draft';
import { ConsentProvider } from '../provider';

const now = Date.now();
const resolution = (input: Partial<PolicyRule> = {}): PolicyResolution => {
	const policy = normalizePolicyRule({
		categories: ['marketing', 'measurement'],
		id: 'test',
		match: { fallback: true },
		model: 'opt-in',
		prompt: 'choice',
		scopeMode: 'strict',
		...input,
	});
	return {
		fingerprints: createPolicyRuleFingerprints(policy),
		matchedBy: 'fallback',
		policy,
		policyId: policy.id,
		status: 'matched',
	};
};
let kernel: ConsentKernel;
const Capture = () => {
	const value = useContext(KernelContext);
	useEffect(() => {
		if (value) {
			kernel = value;
		}
	}, [value]);
	return null;
};
const DraftProbe = () => {
	const draft = useConsentDraft();
	return (
		<>
			<output data-testid="draft">
				{JSON.stringify({
					dirty: draft.isDirty,
					stale: draft.isStale,
					values: draft.values,
				})}
			</output>
			<button
				type="button"
				onClick={() => draft.set('marketing', true)}
			>
				Select marketing
			</button>
			<button
				type="button"
				onClick={() => draft.set('necessary', false)}
			>
				Change necessary
			</button>
			<button
				type="button"
				onClick={() => draft.save()}
			>
				Save draft
			</button>
		</>
	);
};
afterEach(() => vi.restoreAllMocks());
describe('policy presentation reference behavior', () => {
	it('dismisses a nonblocking notice without consent callbacks or requests', async () => {
		const choice = vi.fn();
		const save = vi.fn();
		const init = vi.fn();
		const screen = await render(
			<ConsentProvider
				options={{
					callbacks: { onChoiceRecorded: choice },
					mode: custom({ init, save }),
					persistence: false,
					prefetch: {
						initialPolicyResolution: resolution({
							model: 'opt-out',
							prompt: 'notice',
						}),
						now,
					},
				}}
			>
				<Capture />
				<ConsentBanner />
				<ConsentDialogTrigger />
			</ConsentProvider>
		);
		await expect
			.element(screen.getByTestId('consent-banner-dismiss-button'))
			.toBeVisible();
		expect(
			document.querySelector('[data-testid="consent-banner-accept-button"]')
		).toBeNull();
		expect(
			document.querySelector('[data-testid="consent-banner-overlay"]')
		).toBeNull();
		await screen.getByTestId('consent-banner-dismiss-button').click();
		expect(
			kernel.getSnapshot().noticeDismissal?.dismissedAt
		).toBeGreaterThanOrEqual(now);
		expect(kernel.getSnapshot().explicitChoice).toBeNull();
		expect(choice).not.toHaveBeenCalled();
		expect(save).not.toHaveBeenCalled();
		expect(init).not.toHaveBeenCalled();
	});
	it('keeps explicit masked choices selected and saves only displayed categories', async () => {
		const policy = resolution({
			privacySignals: { gpc: { denyCategories: ['marketing'] } },
		});
		if (policy.status !== 'matched') {
			throw new Error('Fixture must match');
		}
		const initial: KernelConfig = {
			initialPolicyResolution: policy,
			initialPrivacySignals: { gpc: true },
			initialRecords: {
				choice: {
					categories: {
						marketing: {
							basis: {
								fingerprint: policy.fingerprints.choice,
								kind: 'choice-v1',
							},
							confirmedAt: now - 1,
							value: true,
						},
					},
					version: 3,
				},
			},
			now,
		};
		const choice = vi.fn();
		const screen = await render(
			<ConsentProvider
				options={{
					callbacks: { onChoiceRecorded: choice },
					mode: custom({}),
					persistence: false,
					prefetch: initial,
				}}
			>
				<Capture />
				<ConsentDraftProvider>
					<DraftProbe />
				</ConsentDraftProvider>
			</ConsentProvider>
		);
		await expect
			.element(screen.getByTestId('draft'))
			.toHaveTextContent('"marketing":true');
		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(false);
		await screen.getByRole('button', { name: 'Change necessary' }).click();
		await screen.getByRole('button', { name: 'Save draft' }).click();
		expect(choice).toHaveBeenCalledTimes(1);
		expect(choice.mock.calls[0]?.[0].confirmed).toEqual([
			'marketing',
			'measurement',
		]);
		expect(
			kernel.getSnapshot().explicitChoice?.categories.marketing?.value
		).toBe(true);
		expect(
			kernel.getSnapshot().explicitChoice?.categories.functionality
		).toBeUndefined();
	});
	it('requires review when a material policy changes during a dirty draft', async () => {
		let policy = resolution();
		const choice = vi.fn();
		const screen = await render(
			<ConsentProvider
				options={{
					callbacks: { onChoiceRecorded: choice },
					mode: custom({
						init: () => Promise.resolve({ policyResolution: policy }),
					}),
					persistence: false,
					prefetch: { initialPolicyResolution: policy, now },
				}}
			>
				<Capture />
				<ConsentDraftProvider>
					<DraftProbe />
				</ConsentDraftProvider>
			</ConsentProvider>
		);
		await screen.getByRole('button', { name: 'Select marketing' }).click();
		policy = resolution({ copyRevision: 'changed' });
		await kernel.commands.init();
		await screen.getByRole('button', { name: 'Save draft' }).click();
		await expect
			.element(screen.getByTestId('draft'))
			.toHaveTextContent('"stale":true');
		expect(choice).not.toHaveBeenCalled();
		expect(kernel.getSnapshot().explicitChoice).toBeNull();
	});
	it('keeps preferences reachable before a choice and preserves a required notice after saving', async () => {
		const screen = await render(
			<ConsentProvider
				options={{
					mode: custom({}),
					persistence: false,
					prefetch: {
						initialPolicyResolution: resolution({
							model: 'opt-out',
							prompt: 'notice',
						}),
						now,
					},
				}}
			>
				<Capture />
				<ConsentBanner />
				<ConsentDialogTrigger />
				<ConsentDialog />
			</ConsentProvider>
		);
		const trigger = document.querySelector<HTMLButtonElement>(
			'[data-testid="consent-dialog-trigger"] button, button[data-testid="consent-dialog-trigger"]'
		);
		expect(trigger).not.toBeNull();
		trigger?.click();
		await expect
			.element(screen.getByTestId('consent-widget-footer-save-button'))
			.toBeVisible();
		await screen.getByTestId('consent-widget-footer-save-button').click();
		expect(kernel.getSnapshot().promptRequirement.kind).toBe('notice');
		expect(kernel.getSnapshot().noticeDismissal).toBeNull();
	});
});

it('hydrates prepared server HTML without a prompt flash, callback, request or storage write', async () => {
	const { renderToString } = await import('react-dom/server');
	const { hydrateRoot } = await import('react-dom/client');
	const { readStoredRecordsFromCookieHeader } =
		await import('@c15t/core/modules/persistence');
	const clock = Date.now();
	const initialPolicyResolution = resolution({
		model: 'opt-out',
		prompt: 'notice',
	});
	const initialRecords = readStoredRecordsFromCookieHeader(
		document.cookie,
		undefined,
		clock
	);
	const init = vi.fn();
	const onChoiceRecorded = vi.fn();
	const onPermissionsChanged = vi.fn();
	const setItem = vi.spyOn(Storage.prototype, 'setItem');
	const errors = vi.spyOn(console, 'error');
	const app = (
		<ConsentProvider
			options={{
				callbacks: { onChoiceRecorded, onPermissionsChanged },
				mode: custom({ init }),
				prefetch: { initialPolicyResolution, initialRecords, now: clock },
			}}
		>
			<ConsentBanner />
		</ConsentProvider>
	);
	const host = document.createElement('div');
	host.innerHTML = renderToString(app);
	const before = host.innerHTML;
	document.body.append(host);
	const root = hydrateRoot(host, app);
	// oxlint-disable-next-line promise/avoid-new -- Allow hydration effects to flush before asserting their absence.
	await new Promise<void>((resolve) => {
		setTimeout(resolve, 30);
	});
	expect(host.innerHTML).toBe(before);
	expect(
		host.querySelector('[data-testid="consent-banner-dismiss-button"]')
	).not.toBeNull();
	expect(onChoiceRecorded).not.toHaveBeenCalled();
	expect(onPermissionsChanged).not.toHaveBeenCalled();
	expect(init).not.toHaveBeenCalled();
	expect(setItem).not.toHaveBeenCalled();
	expect(errors).not.toHaveBeenCalled();
	root.unmount();
	host.remove();
});
