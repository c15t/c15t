import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

import { ComponentFixtureProvider as ConsentProvider } from '~/__tests__/component-fixture-provider';
import { policyFixture } from '~/__tests__/policy-fixture';
import { ConsentDialog } from '~/components/consent-dialog';
import { ConsentDialogLink } from '~/components/consent-dialog-link';
import { ConsentDialogTrigger } from '~/components/consent-dialog-trigger';
import { offline } from '~/transports/offline';

describe('ConsentDialogLink', () => {
	beforeEach(() => {
		window.localStorage.clear();
		vi.clearAllMocks();
	});

	test.each(['opt-in', 'opt-out'] as const)(
		'exposes the rights of the %s policy on preferences controls',
		async (model) => {
			render(
				<ConsentProvider
					options={{
						mode: offline(),
						prefetch: policyFixture({}, { model }),
					}}
				>
					<ConsentDialogLink>Preferences</ConsentDialogLink>
					<ConsentDialogTrigger />
				</ConsentProvider>
			);
			await vi.waitFor(() => {
				for (const testId of [
					'consent-dialog-link',
					'consent-dialog-trigger',
				]) {
					expect(
						document.querySelector(`[data-testid="${testId}"]`)
					).toHaveAttribute(
						'data-c15t-rights',
						model === 'opt-out'
							? 'disclosure opt-out preferences'
							: 'disclosure preferences'
					);
				}
			});
		}
	);

	test('renders custom text and opens the dialog when clicked', async () => {
		render(
			<ConsentProvider options={{ mode: offline() }}>
				<ConsentDialog />
				<ConsentDialogLink>Your privacy settings</ConsentDialogLink>
			</ConsentProvider>
		);

		await vi.waitFor(
			() => {
				const link = document.querySelector(
					'[data-testid="consent-dialog-link"]'
				) as HTMLButtonElement | null;
				expect(link).toBeInTheDocument();
				expect(link?.textContent).toContain('Your privacy settings');
				expect(link?.className ?? '').toBe('');
			},
			{ timeout: 3000 }
		);

		const link = document.querySelector(
			'[data-testid="consent-dialog-link"]'
		) as HTMLButtonElement;
		await userEvent.click(link);

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

	test('supports asChild for anchor-based footer links', async () => {
		render(
			<ConsentProvider options={{ mode: offline() }}>
				<ConsentDialog />
				<ConsentDialogLink asChild>
					<a
						href="#privacy-settings"
						data-testid="consent-preferences-anchor"
					>
						Manage Preferences
					</a>
				</ConsentDialogLink>
			</ConsentProvider>
		);

		await vi.waitFor(
			() => {
				const anchor = document.querySelector(
					'[data-testid="consent-preferences-anchor"]'
				) as HTMLAnchorElement | null;
				expect(anchor).toBeInTheDocument();
				expect(anchor?.hasAttribute('noStyle')).toBe(false);
				expect(anchor?.hasAttribute('nostyle')).toBe(false);
			},
			{ timeout: 3000 }
		);

		const anchor = document.querySelector(
			'[data-testid="consent-preferences-anchor"]'
		) as HTMLAnchorElement;
		await userEvent.click(anchor);

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
