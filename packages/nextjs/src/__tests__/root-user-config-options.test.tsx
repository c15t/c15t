/**
 * `ConsentRoot` props merge over `c15t.config.ts` per option: an `options`
 * prop replaces only the keys it names, and `options.callbacks` replaces
 * only the callbacks it names. Passing `options={{ nonce }}` must not drop
 * the config's callbacks, translations or mode.
 */
import { ConsentBanner, custom } from '@c15t/react';
import { afterEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { ConsentRoot } from '../root';
import { policyFixture } from './policy-fixture';

const configured = vi.hoisted(() => ({
	recorded: vi.fn(),
	save: vi.fn(() => Promise.resolve({ ok: true as const })),
	shown: vi.fn(),
}));

// oxlint-disable-next-line anti-slop/no-module-mocking -- In an app build, the bundler alias `withConsentManifest` sets swaps this module for the app's c15t.config.ts. The mock is that alias; ConsentRoot is real.
vi.mock('@c15t/nextjs/user-config', () => ({
	default: {
		backendURL: 'https://consent.example.com',
		options: {
			callbacks: {
				onChoiceRecorded: configured.recorded,
				onSurfaceShown: configured.shown,
			},
			// A category to grant, so Accept records a choice.
			consentCategories: ['marketing'],
			i18n: {
				messages: { en: { cookieBanner: { title: 'Title from config' } } },
			},
			mode: custom({ init: () => Promise.resolve({}), save: configured.save }),
		},
	},
}));

afterEach(() => {
	vi.clearAllMocks();
});

test("an options prop keeps the config's other options and callbacks", async () => {
	const recorded = vi.fn();
	const screen = await render(
		<ConsentRoot
			state={policyFixture()}
			persistence={false}
			options={{
				callbacks: { onChoiceRecorded: recorded },
				nonce: 'prop-nonce',
			}}
		>
			<ConsentBanner />
		</ConsentRoot>
	);

	// The config's translations and callbacks survive the prop.
	await expect
		.element(screen.getByText('Title from config'))
		.toBeInTheDocument();
	await vi.waitFor(() => expect(configured.shown).toHaveBeenCalled());

	// The config's mode survives too, and the prop's callback wins.
	await screen.getByTestId('consent-banner-accept-button').click();
	await vi.waitFor(() => expect(configured.save).toHaveBeenCalledTimes(1));
	await vi.waitFor(() => expect(recorded).toHaveBeenCalledTimes(1));
	expect(configured.recorded).not.toHaveBeenCalled();
});
