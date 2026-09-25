import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

import { ComponentFixtureProvider as ConsentProvider } from '~/__tests__/component-fixture-provider';
import { policyFixture } from '~/__tests__/policy-fixture';
import { registerDialogChunkWarmer } from '~/chunk-warming';
import { ConsentDialogLink } from '~/components/panel-link';
import { ConsentBanner } from '~/components/prompt';
import { offline } from '~/transports/offline';

const options = {
	mode: offline(),
	persistence: false,
	prefetch: policyFixture(),
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

// The registry warms once per page, so this is the only test that can observe
// the first warm-up.
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
