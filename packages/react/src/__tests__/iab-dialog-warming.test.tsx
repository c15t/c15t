import { MINIMAL_GVL } from '@c15t/conformance';
import { custom } from '@c15t/core';
import type { GlobalVendorList } from '@c15t/schema/types';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

import { ConsentDialog } from '~/aggregate-components';
import {
	registerDialogChunkWarmer,
	resetDialogChunkWarmingForTests,
} from '~/chunk-warming';
import { ConsentBanner } from '~/components/prompt';
import { IABConsentBanner, IABConsentDialog } from '~/iab';
import { resetIABDialogWarmingForTests } from '~/iab-dialog-deferred';

import { ComponentFixtureProvider } from './component-fixture-provider';
import type { ComponentFixtureOptions } from './component-fixture-provider';
import { moduleRequested as moduleLoaded } from './module-requests';
import { policyFixture } from './policy-fixture';

// A loaded module stays loaded, so the test that loads the IAB dialog runs
// last.
const IAB_DIALOG_MODULE = '/src/components/iab-panel/iab-panel.tsx';
const DIALOG_MODULE = '/src/components/panel/panel.tsx';

const options = (model: 'iab' | 'opt-in'): ComponentFixtureOptions => ({
	disableAnimation: true,
	iab: { cmpId: 123, gvl: MINIMAL_GVL as unknown as GlobalVendorList },
	mode: custom({}),
	persistence: false,
	prefetch: policyFixture({}, { model }),
});

const byTestId = (testId: string) =>
	document.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`);

// Idle callbacks the page scheduled, run on demand instead of by the browser.
let idleCallbacks: IdleRequestCallback[] = [];
const runIdleCallbacks = () => {
	const pending = idleCallbacks;
	idleCallbacks = [];
	for (const runIdle of pending) {
		runIdle({ didTimeout: false, timeRemaining: () => 50 });
	}
};

beforeEach(async () => {
	// Keep the pointer off where the banner renders: a pointer enter there
	// warms on intent, and these tests separate intent from idle.
	await userEvent.hover(document.documentElement, { position: { x: 1, y: 1 } });
	resetDialogChunkWarmingForTests();
	resetIABDialogWarmingForTests();
	idleCallbacks = [];
	vi.stubGlobal('requestIdleCallback', (scheduled: IdleRequestCallback) => {
		idleCallbacks.push(scheduled);
		return idleCallbacks.length;
	});
});

afterEach(() => {
	vi.unstubAllGlobals();
});

test('idle warming under another model loads the standard dialog, not the IAB one', async () => {
	const screen = await render(
		<ComponentFixtureProvider options={options('opt-in')}>
			<ConsentBanner disableAnimation />
			<ConsentDialog />
			<IABConsentDialog />
		</ComponentFixtureProvider>
	);
	await vi.waitFor(() => expect(idleCallbacks.length).toBeGreaterThan(0));
	runIdleCallbacks();
	await vi.waitFor(() => expect(moduleLoaded(DIALOG_MODULE)).toBe(true), {
		timeout: 5000,
	});
	await new Promise((resolve) => {
		setTimeout(resolve, 100);
	});
	expect(moduleLoaded(IAB_DIALOG_MODULE)).toBe(false);
	await screen.unmount();
});

test.each([
	'iab-consent-banner-customize-button',
	'iab-consent-banner-partners-link',
])('focus on %s warms the dialog', async (testId) => {
	const warmer = vi.fn();
	const unregister = registerDialogChunkWarmer(warmer);
	try {
		// No IABConsentDialog here, so the warm does not load its module.
		const screen = await render(
			<ComponentFixtureProvider options={options('iab')}>
				<IABConsentBanner disableAnimation />
			</ComponentFixtureProvider>
		);
		await vi.waitFor(() => expect(byTestId(testId)).not.toBeNull());
		expect(warmer).not.toHaveBeenCalled();
		byTestId(testId)?.focus();
		expect(warmer).toHaveBeenCalledOnce();
		await screen.unmount();
	} finally {
		unregister();
	}
});

test('loads the IAB dialog in idle time while the IAB banner is shown', async () => {
	const screen = await render(
		<ComponentFixtureProvider options={options('iab')}>
			<IABConsentBanner disableAnimation />
			<IABConsentDialog />
		</ComponentFixtureProvider>
	);
	await vi.waitFor(() =>
		expect(byTestId('iab-consent-banner-customize-button')).not.toBeNull()
	);
	await vi.waitFor(() => expect(idleCallbacks).toHaveLength(1));
	expect(moduleLoaded(IAB_DIALOG_MODULE)).toBe(false);

	runIdleCallbacks();
	await vi.waitFor(() => expect(moduleLoaded(IAB_DIALOG_MODULE)).toBe(true), {
		timeout: 5000,
	});
	// Loaded, not opened.
	expect(
		document.querySelector('[data-testid="iab-consent-dialog-root"]')
	).toBe(null);
	await screen.unmount();
});
