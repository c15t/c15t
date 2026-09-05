/**
 * E2E tests for activeUI state transitions.
 *
 * Tests that UI visibility is driven by the `activeUI` enum
 * and transitions correctly between 'none', 'banner', and 'dialog'.
 *
 * @packageDocumentation
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

import { ComponentFixtureProvider as ConsentProvider } from '~/__tests__/component-fixture-provider';
import type { ComponentFixtureOptions as ConsentProviderOptions } from '~/__tests__/component-fixture-provider';
import { createVoidDeferredPromise } from '~/__tests__/deferred-promise';
import { policyFixture } from '~/__tests__/policy-fixture';
import { ConsentBanner } from '~/components/consent-banner';
import { ConsentDialog } from '~/components/consent-dialog';
import { ConsentDialogTrigger } from '~/components/consent-dialog-trigger';
import { offline } from '~/transports/offline';

const getDefined = <Value,>(
	value: Value,
	message = 'Expected value to be defined'
): NonNullable<Value> => {
	if (value === null || value === undefined) {
		throw new Error(message);
	}
	return value;
};

// Mock localStorage
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		clear: () => {
			store = {};
		},
		getItem: (key: string) => store[key] || null,
		removeItem: (key: string) => {
			Reflect.deleteProperty(store, key);
		},
		setItem: (key: string, value: string) => {
			store[key] = value.toString();
		},
	};
})();

Object.defineProperty(window, 'localStorage', {
	value: localStorageMock,
});

const defaultOptions: ConsentProviderOptions = {
	consentCategories: [
		'necessary',
		'functionality',
		'experience',
		'marketing',
		'measurement',
	],
	mode: offline(),
	prefetch: policyFixture(undefined, {
		categories: [
			'necessary',
			'functionality',
			'experience',
			'marketing',
			'measurement',
		],
		id: 'active-ui-transitions-test',
		model: 'opt-in',
		prompt: 'choice',
		scopeMode: 'permissive',
	}),
};

const storedAcceptAllConsent = () => ({
	consentInfo: {
		subjectId: 'sub_123456789ABC',
		time: Date.now(),
		type: 'accept-all',
	},
	consents: {
		experience: true,
		functionality: true,
		marketing: true,
		measurement: true,
		necessary: true,
	},
});

describe('activeUI Transitions E2E Tests', () => {
	beforeEach(() => {
		window.localStorage.clear();
		const cookies = document.cookie.split(';');
		for (const cookie of cookies) {
			const name = cookie.split('=')[0]?.trim();
			if (name) {
				document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
			}
		}
		vi.clearAllMocks();
	});

	test('banner shows on first visit (activeUI becomes banner)', async () => {
		render(
			<ConsentProvider options={defaultOptions}>
				<ConsentBanner />
			</ConsentProvider>
		);

		await vi.waitFor(
			() => {
				const banner = document.querySelector(
					'[data-testid="consent-banner-root"]'
				);
				expect(banner).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);
	});

	test('customize transitions banner → dialog', async () => {
		render(
			<ConsentProvider options={defaultOptions}>
				<ConsentBanner />
				<ConsentDialog />
			</ConsentProvider>
		);

		// Wait for banner
		await vi.waitFor(
			() => {
				const banner = document.querySelector(
					'[data-testid="consent-banner-root"]'
				);
				expect(banner).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);

		// Click customize
		const customizeButton = document.querySelector(
			'[data-testid="consent-banner-customize-button"]'
		);
		await userEvent.click(getDefined(customizeButton));

		// Dialog should open
		await vi.waitFor(
			() => {
				const dialog = document.querySelector(
					'[data-testid="consent-dialog-root"]'
				);
				expect(dialog).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);

		// Banner should be gone
		const banner = document.querySelector(
			'[data-testid="consent-banner-root"]'
		);
		expect(banner).not.toBeInTheDocument();
	});

	test('save from dialog hides all UI', async () => {
		render(
			<ConsentProvider options={defaultOptions}>
				<ConsentBanner />
				<ConsentDialog />
			</ConsentProvider>
		);

		// Wait for banner, then click customize
		await vi.waitFor(
			() => {
				const btn = document.querySelector(
					'[data-testid="consent-banner-customize-button"]'
				);
				expect(btn).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);
		const customizeButton = document.querySelector(
			'[data-testid="consent-banner-customize-button"]'
		);
		await userEvent.click(getDefined(customizeButton));

		// Wait for dialog
		await vi.waitFor(
			() => {
				const dialog = document.querySelector(
					'[data-testid="consent-dialog-root"]'
				);
				expect(dialog).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);

		// Click save in dialog
		const saveButton = document.querySelector(
			'[data-testid="consent-widget-footer-save-button"]'
		);
		await userEvent.click(getDefined(saveButton));

		// Both banner and dialog should be gone
		await vi.waitFor(
			() => {
				const banner = document.querySelector(
					'[data-testid="consent-banner-root"]'
				);
				const dialog = document.querySelector(
					'[data-testid="consent-dialog-root"]'
				);
				expect(banner).not.toBeInTheDocument();
				expect(dialog).not.toBeInTheDocument();
			},
			{ timeout: 3000 }
		);
	});

	test('banner hidden for returning visitor', async () => {
		// Pre-set localStorage consent
		window.localStorage.setItem(
			'c15t',
			JSON.stringify(storedAcceptAllConsent())
		);

		render(
			<ConsentProvider options={defaultOptions}>
				<ConsentBanner />
			</ConsentProvider>
		);

		// Wait long enough to confirm banner doesn't appear
		await createVoidDeferredPromise((resolve) => setTimeout(resolve, 500));

		const banner = document.querySelector(
			'[data-testid="consent-banner-root"]'
		);
		expect(banner).not.toBeInTheDocument();
	});

	test('trigger appears after consent, opens dialog on click', async () => {
		render(
			<ConsentProvider options={defaultOptions}>
				<ConsentBanner />
				<ConsentDialog />
				<ConsentDialogTrigger showWhen="always" />
			</ConsentProvider>
		);

		// Wait for banner
		await vi.waitFor(
			() => {
				const btn = document.querySelector(
					'[data-testid="consent-banner-accept-button"]'
				);
				expect(btn).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);

		// Accept all
		const acceptButton = document.querySelector(
			'[data-testid="consent-banner-accept-button"]'
		);
		await userEvent.click(getDefined(acceptButton));

		// Banner should disappear
		await vi.waitFor(
			() => {
				const banner = document.querySelector(
					'[data-testid="consent-banner-root"]'
				);
				expect(banner).not.toBeInTheDocument();
			},
			{ timeout: 3000 }
		);

		// Trigger should appear
		await vi.waitFor(
			() => {
				const trigger = document.querySelector(
					'button[aria-label="Open privacy settings"]'
				);
				expect(trigger).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);

		// Click trigger — dialog should open
		const trigger = document.querySelector(
			'button[aria-label="Open privacy settings"]'
		);
		await userEvent.click(getDefined(trigger));

		await vi.waitFor(
			() => {
				const dialog = document.querySelector(
					'[data-testid="consent-dialog-root"]'
				);
				expect(dialog).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);
	});

	test('full lifecycle: banner → customize → dialog → save → trigger → dialog', async () => {
		render(
			<ConsentProvider options={defaultOptions}>
				<ConsentBanner />
				<ConsentDialog />
				<ConsentDialogTrigger showWhen="always" />
			</ConsentProvider>
		);

		// Step 1: Banner appears
		await vi.waitFor(
			() => {
				const banner = document.querySelector(
					'[data-testid="consent-banner-root"]'
				);
				expect(banner).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);

		// Step 2: Click customize → transitions to dialog
		const customizeButton = document.querySelector(
			'[data-testid="consent-banner-customize-button"]'
		);
		await userEvent.click(getDefined(customizeButton));

		await vi.waitFor(
			() => {
				const dialog = document.querySelector(
					'[data-testid="consent-dialog-root"]'
				);
				expect(dialog).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);

		// Step 3: Save from dialog → hides everything
		const saveButton = document.querySelector(
			'[data-testid="consent-widget-footer-save-button"]'
		);
		await userEvent.click(getDefined(saveButton));

		await vi.waitFor(
			() => {
				const dialog = document.querySelector(
					'[data-testid="consent-dialog-root"]'
				);
				expect(dialog).not.toBeInTheDocument();
			},
			{ timeout: 3000 }
		);

		// Step 4: Trigger appears
		await vi.waitFor(
			() => {
				const trigger = document.querySelector(
					'button[aria-label="Open privacy settings"]'
				);
				expect(trigger).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);

		// Step 5: Click trigger → dialog opens again
		const trigger = document.querySelector(
			'button[aria-label="Open privacy settings"]'
		);
		await userEvent.click(getDefined(trigger));

		await vi.waitFor(
			() => {
				const dialog = document.querySelector(
					'[data-testid="consent-dialog-root"]'
				);
				expect(dialog).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);
	});
});
