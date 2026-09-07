import type { PolicyRule } from '@c15t/schema/types';
import type { ReactNode } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

import { ComponentFixtureProvider } from '~/__tests__/component-fixture-provider';
import { policyFixture } from '~/__tests__/policy-fixture';
import { ConsentBanner } from '~/components/consent-banner';
import { ConsentDialog } from '~/components/consent-dialog';
import { offline } from '~/transports/offline';

import { ConsentDialogTrigger, ConsentDialogTriggerToolbar } from '../index';

const OPT_OUT_NOTICE: Partial<PolicyRule> = {
	model: 'opt-out',
	prompt: 'notice',
};

const OPT_IN_CHOICE: Partial<PolicyRule> = {
	model: 'opt-in',
	prompt: 'choice',
};

const renderWithRule = function renderWithRule(
	rule: Partial<PolicyRule>,
	children: ReactNode
) {
	return render(
		<ComponentFixtureProvider
			options={{
				mode: offline(),
				persistence: false,
				prefetch: policyFixture(undefined, {
					id: 'trigger-rights-test',
					...rule,
				}),
			}}
		>
			<ConsentBanner />
			<ConsentDialog />
			{children}
		</ComponentFixtureProvider>
	);
};

const queryPreferencesAction = function queryPreferencesAction() {
	return document.querySelector<HTMLButtonElement>(
		'[role="toolbar"] [data-c15t-trigger-action="preferences"]'
	);
};

const waitForPreferencesAction =
	async function waitForPreferencesAction(): Promise<HTMLButtonElement> {
		await vi.waitFor(() => {
			expect(queryPreferencesAction()).toBeInTheDocument();
		});
		const action = queryPreferencesAction();
		if (!action) {
			throw new Error('Expected the toolbar preferences action to render');
		}
		return action;
	};

describe('ConsentDialogTriggerToolbar rights-aware action', () => {
	test('labels the built-in action as the opt-out right under an opt-out rule', async () => {
		renderWithRule(OPT_OUT_NOTICE, <ConsentDialogTriggerToolbar />);

		const action = await waitForPreferencesAction();
		expect(action).toHaveAttribute(
			'aria-label',
			'Do not sell or share my personal information'
		);
		expect(action.dataset.right).toBe('opt-out');
		expect(action.dataset.c15tRights?.split(' ')).toContain('opt-out');
	});

	test('labels the built-in action as the preferences right under an opt-in rule', async () => {
		renderWithRule(OPT_IN_CHOICE, <ConsentDialogTriggerToolbar />);

		const action = await waitForPreferencesAction();
		expect(action).toHaveAttribute('aria-label', 'Manage preferences');
		expect(action.dataset.right).toBe('preferences');
		expect(action.dataset.c15tRights?.split(' ')).not.toContain('opt-out');
	});

	test('a host label overrides the rights-based default', async () => {
		renderWithRule(
			OPT_OUT_NOTICE,
			<ConsentDialogTriggerToolbar preferences={{ label: 'Privacy choices' }} />
		);

		const action = await waitForPreferencesAction();
		expect(action).toHaveAttribute('aria-label', 'Privacy choices');
		expect(action.dataset.right).toBe('opt-out');
	});

	test('the built-in action still opens the preference center', async () => {
		// The notice renders as a bottom bar, so keep the toolbar clear of it.
		renderWithRule(
			OPT_OUT_NOTICE,
			<ConsentDialogTriggerToolbar
				defaultPosition="top-right"
				persistPosition={false}
			/>
		);

		const action = await waitForPreferencesAction();
		await userEvent.click(action);

		await vi.waitFor(() => {
			expect(
				document.querySelector('[data-testid="consent-dialog-root"]')
			).toBeInTheDocument();
		});
	});
});

describe('after-prompt visibility', () => {
	test('hides the toolbar while a notice is owed and shows it after dismissal', async () => {
		renderWithRule(
			OPT_OUT_NOTICE,
			<ConsentDialogTriggerToolbar showWhen="after-prompt" />
		);

		await vi.waitFor(() => {
			expect(
				document.querySelector('[data-testid="consent-banner-root"]')
			).toBeInTheDocument();
		});
		expect(document.querySelector('[role="toolbar"]')).not.toBeInTheDocument();

		const dismiss = document.querySelector<HTMLButtonElement>(
			'[data-testid="consent-banner-dismiss-button"]'
		);
		if (!dismiss) {
			throw new Error('Expected the notice dismiss button to render');
		}
		await userEvent.click(dismiss);

		await vi.waitFor(() => {
			expect(
				document.querySelector('[data-testid="consent-banner-root"]')
			).not.toBeInTheDocument();
			expect(document.querySelector('[role="toolbar"]')).toBeInTheDocument();
		});
	});

	test('hides the single trigger while a choice is owed and shows it after a choice', async () => {
		renderWithRule(
			OPT_IN_CHOICE,
			<ConsentDialogTrigger showWhen="after-prompt" />
		);

		await vi.waitFor(() => {
			expect(
				document.querySelector('[data-testid="consent-banner-root"]')
			).toBeInTheDocument();
		});
		expect(
			document.querySelector('button[data-c15t-trigger="true"]')
		).not.toBeInTheDocument();

		const accept = document.querySelector<HTMLButtonElement>(
			'[data-testid="consent-banner-accept-button"]'
		);
		if (!accept) {
			throw new Error('Expected the accept button to render');
		}
		await userEvent.click(accept);

		await vi.waitFor(() => {
			expect(
				document.querySelector('button[data-c15t-trigger="true"]')
			).toBeInTheDocument();
		});
	});

	test('always keeps the toolbar visible while a prompt is owed', async () => {
		renderWithRule(
			OPT_OUT_NOTICE,
			<ConsentDialogTriggerToolbar showWhen="always" />
		);

		await vi.waitFor(() => {
			expect(document.querySelector('[role="toolbar"]')).toBeInTheDocument();
		});
		expect(
			document.querySelector('[data-testid="consent-banner-root"]')
		).toBeInTheDocument();
	});
});
