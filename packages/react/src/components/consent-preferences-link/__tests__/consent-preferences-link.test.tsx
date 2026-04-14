import { beforeEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { ConsentDialog } from '~/components/consent-dialog';
import { ConsentDialogLink } from '~/components/consent-dialog-link';
import {
	ConsentManagerProvider,
	clearConsentRuntimeCache,
} from '~/providers/consent-manager-provider';

describe('ConsentDialogLink', () => {
	beforeEach(() => {
		clearConsentRuntimeCache();
		window.localStorage.clear();
		vi.clearAllMocks();
	});

	test('renders custom text and opens the dialog when clicked', async () => {
		render(
			<ConsentManagerProvider options={{ mode: 'offline' }}>
				<ConsentDialog />
				<ConsentDialogLink>Your privacy settings</ConsentDialogLink>
			</ConsentManagerProvider>
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
			<ConsentManagerProvider options={{ mode: 'offline' }}>
				<ConsentDialog />
				<ConsentDialogLink asChild>
					<a href="#privacy-settings" data-testid="consent-preferences-anchor">
						Manage Preferences
					</a>
				</ConsentDialogLink>
			</ConsentManagerProvider>
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
