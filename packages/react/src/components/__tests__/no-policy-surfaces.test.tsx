import type { PolicyResolution } from '@c15t/schema/types';
import { writePolicyResolutionWire } from '@c15t/schema/types';
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { ComponentFixtureProvider } from '~/__tests__/component-fixture-provider';
import { policyFixture } from '~/__tests__/policy-fixture';
import { ConsentBanner } from '~/components/consent-banner';
import { ConsentDialog } from '~/components/consent-dialog';
import {
	ConsentDialogTrigger,
	ConsentDialogTriggerToolbar,
} from '~/components/consent-dialog-trigger';
import { ConsentDialogLink } from '~/components/consent-preferences-link/consent-preferences-link';
import { ConsentWidget } from '~/components/consent-widget';
import { custom } from '~/index';
import { ConsentProvider } from '~/provider';
import { offline } from '~/transports/offline';

/**
 * Without a resolved policy rule there is nothing to consent to, so no
 * prebuilt consent surface renders. App-owned toolbar actions still do.
 */

const UNCONFIGURED: PolicyResolution = { policy: null, status: 'unconfigured' };

const CONSENT_TEST_IDS = [
	'consent-banner-root',
	'consent-dialog-root',
	'consent-widget-root',
	'consent-dialog-link',
	'consent-dialog-trigger',
] as const;

const queryTestId = function queryTestId(testId: string) {
	return document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
};

const queryToolbarAction = function queryToolbarAction(kind: string) {
	return document.querySelector<HTMLButtonElement>(
		`[role="toolbar"] [data-c15t-trigger-action="${kind}"]`
	);
};

const Surfaces = () => (
	<>
		<ConsentBanner />
		<ConsentDialog />
		<ConsentWidget />
		<ConsentDialogLink>Privacy settings</ConsentDialogLink>
		<ConsentDialogTrigger showWhen="always" />
		<ConsentDialogTriggerToolbar
			ariaLabel="Site controls"
			persistPosition={false}
			showWhen="always"
			actions={[
				{
					icon: <span aria-hidden="true">☾</span>,
					id: 'theme',
					label: 'Toggle theme',
					onSelect: () => {},
				},
			]}
		/>
	</>
);

const expectNoConsentSurface = function expectNoConsentSurface() {
	for (const testId of CONSENT_TEST_IDS) {
		expect(queryTestId(testId), testId).toBeNull();
	}
	expect(queryToolbarAction('preferences')).toBeNull();
};

describe('consent surfaces without a resolved policy', () => {
	test('render nothing while the resolution is unconfigured, but keep app-owned toolbar actions', async () => {
		render(
			<ComponentFixtureProvider
				options={{
					initialUI: 'dialog',
					mode: offline(),
					persistence: false,
					prefetch: { initialPolicyResolution: UNCONFIGURED, now: Date.now() },
				}}
			>
				<Surfaces />
			</ComponentFixtureProvider>
		);

		// The app-owned action proves the tree rendered; the c15t item is absent.
		await vi.waitFor(() => {
			expect(queryToolbarAction('custom')).toBeInTheDocument();
		});
		expectNoConsentSurface();
	});

	test('appear once a policy arrives from a late init, without a remount', async () => {
		let settle: (() => void) | undefined;
		// oxlint-disable-next-line promise/avoid-new -- The test controls when the deferred init answers.
		const pending = new Promise<{ policyResolution: unknown }>((resolve) => {
			settle = () =>
				resolve({
					policyResolution: writePolicyResolutionWire(
						policyFixture().initialPolicyResolution
					),
				});
		});

		// The plain provider: the fixture provider would substitute a matched
		// prefetch, and this test needs the kernel to start without a policy.
		render(
			<ConsentProvider
				options={{
					mode: custom({ init: () => pending }),
					persistence: false,
				}}
			>
				<Surfaces />
			</ConsentProvider>
		);

		await vi.waitFor(() => {
			expect(queryToolbarAction('custom')).toBeInTheDocument();
		});
		expectNoConsentSurface();

		settle?.();

		// The prompt is owed under the resolved opt-in rule, so the banner shows,
		// and the persistent routes to preferences appear beside it.
		await vi.waitFor(() => {
			expect(queryTestId('consent-banner-root')).toBeInTheDocument();
			expect(queryTestId('consent-dialog-link')).toBeInTheDocument();
			expect(queryTestId('consent-dialog-trigger')).toBeInTheDocument();
			expect(queryTestId('consent-widget-root')).toBeInTheDocument();
			expect(queryToolbarAction('preferences')).toBeInTheDocument();
		});
	});

	test('the preference dialog stays closed without a policy even when asked to open', async () => {
		render(
			<ComponentFixtureProvider
				options={{
					initialUI: 'dialog',
					mode: offline(),
					persistence: false,
					prefetch: { initialPolicyResolution: UNCONFIGURED, now: Date.now() },
				}}
			>
				<ConsentDialog />
				<ConsentDialogTriggerToolbar
					ariaLabel="Site controls"
					persistPosition={false}
					actions={[
						{
							icon: <span aria-hidden="true">☾</span>,
							id: 'theme',
							label: 'Toggle theme',
							onSelect: () => {},
						},
					]}
				/>
			</ComponentFixtureProvider>
		);

		await vi.waitFor(() => {
			expect(queryToolbarAction('custom')).toBeInTheDocument();
		});
		expect(queryTestId('consent-dialog-root')).toBeNull();
	});
});
