import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

import { ComponentFixtureProvider as ConsentProvider } from '~/__tests__/component-fixture-provider';
import { policyFixture } from '~/__tests__/policy-fixture';
import { registerDialogChunkWarmer } from '~/chunk-warming';
import { ConsentDialogLink } from '~/components/panel-link';
import { ConsentDialogTrigger } from '~/components/panel-trigger';
import { ConsentBanner } from '~/components/prompt';
import { offline } from '~/transports/offline';

// Intent only: idle warming would otherwise call the warmer on its own
// schedule while the banner is shown.
const options = {
	mode: offline(),
	persistence: false,
	prefetch: policyFixture(),
	preloadDialog: 'intent',
} as const;

const button = (testId: string) => {
	const element = document.querySelector<HTMLButtonElement>(
		`[data-testid="${testId}"]`
	);
	if (!element) {
		throw new Error(`Missing ${testId}`);
	}
	return element;
};

test('the stock banner Customize button warms the deferred dialog on focus', async () => {
	const warmer = vi.fn();
	const unregister = registerDialogChunkWarmer(warmer);
	try {
		await render(
			<ConsentProvider options={options}>
				<ConsentBanner disableAnimation />
			</ConsentProvider>
		);
		await vi.waitFor(() => button('consent-banner-customize-button'));
		expect(warmer).not.toHaveBeenCalled();

		button('consent-banner-accept-button').focus();
		button('consent-banner-reject-button').focus();
		expect(warmer).not.toHaveBeenCalled();

		button('consent-banner-customize-button').focus();
		expect(warmer).toHaveBeenCalledTimes(1);
	} finally {
		unregister();
	}
});

test('dialog openers still run consumer focus and pointer handlers', async () => {
	const onPointerEnter = vi.fn();
	const onFocus = vi.fn();
	await render(
		<ConsentProvider options={options}>
			<ConsentDialogLink
				onFocus={onFocus}
				onPointerEnter={onPointerEnter}
			>
				Privacy settings
			</ConsentDialogLink>
		</ConsentProvider>
	);
	await vi.waitFor(() => button('consent-dialog-link'));

	await userEvent.hover(button('consent-dialog-link'));
	expect(onPointerEnter).toHaveBeenCalledTimes(1);

	button('consent-dialog-link').focus();
	expect(onFocus).toHaveBeenCalledTimes(1);
});

test('slot focus and pointer handlers still run on consent buttons', async () => {
	const warmer = vi.fn();
	const unregister = registerDialogChunkWarmer(warmer);
	const slot = { onFocus: vi.fn(), onPointerEnter: vi.fn() };
	try {
		await render(
			<ConsentProvider
				options={{
					...options,
					components: { button: { primary: slot, secondary: slot } },
				}}
			>
				<ConsentBanner disableAnimation />
			</ConsentProvider>
		);
		await vi.waitFor(() => button('consent-banner-customize-button'));

		// A button that doesn't open the dialog.
		button('consent-banner-reject-button').focus();
		expect(slot.onFocus).toHaveBeenCalledTimes(1);

		// The Customize button runs the slot handlers and still warms.
		const warmedBefore = warmer.mock.calls.length;
		await userEvent.hover(button('consent-banner-customize-button'));
		expect(slot.onPointerEnter).toHaveBeenCalledTimes(1);
		button('consent-banner-customize-button').focus();
		expect(slot.onFocus).toHaveBeenCalledTimes(2);
		expect(warmer.mock.calls.length).toBeGreaterThan(warmedBefore);
	} finally {
		unregister();
	}
});

test('the trigger runs trigger.root slot focus and pointer handlers', async () => {
	const warmer = vi.fn();
	const unregister = registerDialogChunkWarmer(warmer);
	const root = { onFocus: vi.fn(), onPointerEnter: vi.fn() };
	try {
		await render(
			<ConsentProvider
				options={{ ...options, components: { trigger: { root } } }}
			>
				<ConsentDialogTrigger showWhen="always" />
			</ConsentProvider>
		);
		await vi.waitFor(() => button('consent-dialog-trigger'));

		const warmedBefore = warmer.mock.calls.length;
		await userEvent.hover(button('consent-dialog-trigger'));
		expect(root.onPointerEnter).toHaveBeenCalledTimes(1);
		button('consent-dialog-trigger').focus();
		expect(root.onFocus).toHaveBeenCalledTimes(1);
		expect(warmer.mock.calls.length).toBeGreaterThan(warmedBefore);
	} finally {
		unregister();
	}
});
