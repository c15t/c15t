import type { ConsentKernel } from '@c15t/core';
import { useContext, useEffect } from 'react';
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
import { KernelContext } from '~/context';
import { useHasConsentUI, useModel } from '~/hooks';
import { offline } from '~/transports/offline';

/**
 * A `none` rule grants everything in scope and owes nothing: no prompt, no
 * rights, no record. Without rights no consent surface renders. Listing
 * `preferences` restores the trigger, link and dialog as a settings route,
 * and saving from that dialog still records nothing.
 */

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

let kernel: ConsentKernel | undefined;
let model: ReturnType<typeof useModel>;
let hasConsentUI = false;

const Capture = () => {
	const value = useContext(KernelContext);
	const currentModel = useModel();
	const currentHasConsentUI = useHasConsentUI();
	useEffect(() => {
		kernel = value ?? undefined;
		model = currentModel;
		hasConsentUI = currentHasConsentUI;
	}, [value, currentModel, currentHasConsentUI]);
	return null;
};

const Surfaces = () => (
	<>
		<Capture />
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

const noneRule = function noneRule(
	rights: ('preferences' | 'disclosure')[] = []
) {
	return policyFixture(undefined, {
		id: 'none-test',
		model: 'none',
		prompt: 'none',
		rights,
	});
};

describe('consent surfaces under a none rule', () => {
	test('grants every category and renders no surface without rights', async () => {
		render(
			<ComponentFixtureProvider
				options={{
					initialUI: 'dialog',
					mode: offline(),
					persistence: false,
					prefetch: noneRule(),
				}}
			>
				<Surfaces />
			</ComponentFixtureProvider>
		);

		await vi.waitFor(() => {
			expect(queryToolbarAction('custom')).toBeInTheDocument();
		});
		for (const testId of CONSENT_TEST_IDS) {
			expect(queryTestId(testId), testId).toBeNull();
		}
		expect(queryToolbarAction('preferences')).toBeNull();

		expect(model).toBe('none');
		expect(hasConsentUI).toBe(false);
		const snapshot = kernel?.getSnapshot();
		expect(snapshot?.resolution.status).toBe('matched');
		expect(snapshot?.promptRequirement.kind).toBe('none');
		expect(snapshot?.effectivePermissions.marketing).toBe(true);
		expect(snapshot?.effectivePermissions.measurement).toBe(true);
		expect(snapshot?.explicitChoice).toBeNull();
	});

	test('keeps a settings route when the rule lists the preferences right, and saving records nothing', async () => {
		// Other test files in this browser context may have left consent keys
		// behind; start clean so the storage assertion below is about this save.
		localStorage.clear();
		document.cookie = 'c15t=; Max-Age=0; Path=/';
		render(
			<ComponentFixtureProvider
				options={{
					mode: offline(),
					persistence: false,
					prefetch: noneRule(['preferences']),
				}}
			>
				<Surfaces />
			</ComponentFixtureProvider>
		);

		await vi.waitFor(() => {
			expect(queryTestId('consent-dialog-trigger')).toBeInTheDocument();
			expect(queryTestId('consent-dialog-link')).toBeInTheDocument();
			expect(queryToolbarAction('preferences')).toBeInTheDocument();
		});
		expect(hasConsentUI).toBe(true);
		// No prompt is owed, so no banner.
		expect(queryTestId('consent-banner-root')).toBeNull();
		expect(queryTestId('consent-dialog-root')).toBeNull();

		queryTestId('consent-dialog-trigger')?.click();
		await vi.waitFor(() => {
			expect(queryTestId('consent-dialog-root')).toBeInTheDocument();
		});

		const save = await vi.waitFor(() => {
			const button = document.querySelector<HTMLButtonElement>(
				'[data-testid="consent-dialog-root"] [data-testid="consent-widget-footer-save-button"]'
			);
			expect(button).toBeInTheDocument();
			return button as HTMLButtonElement;
		});
		save.click();

		// The kernel completes the save without writing a record, and the
		// dialog closes because no prompt is owed.
		await vi.waitFor(() => {
			expect(queryTestId('consent-dialog-root')).toBeNull();
		});
		const snapshot = kernel?.getSnapshot();
		expect(snapshot?.explicitChoice).toBeNull();
		expect(snapshot?.effectivePermissions.marketing).toBe(true);
		// Persistence is off for the fixture, and the kernel wrote no record
		// either way: no consent key reaches storage.
		const consentKeys = Object.keys(localStorage).filter((key) =>
			key.startsWith('c15t')
		);
		expect(consentKeys).toEqual([]);
		expect(document.cookie).not.toMatch(/(?<boundary>^|;\s*)c15t=/u);
	});
});
