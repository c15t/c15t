/**
 * E2E tests for the `models` prop on consent components.
 *
 * Verifies that components only render when the current consent model
 * matches their `models` prop (default or explicitly set).
 *
 * @packageDocumentation
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { ConsentBanner } from '~/components/consent-banner';
import { ConsentDialog } from '~/components/consent-dialog';
import {
	clearConsentState,
	defaultIABOptions,
} from '~/components/iab/__tests__/e2e-setup';
import { IABConsentBanner } from '~/components/iab-consent-banner';
import { IABConsentDialog } from '~/components/iab-consent-dialog';
import {
	ConsentManagerProvider,
	clearConsentRuntimeCache,
} from '~/providers/consent-manager-provider';
import type { ConsentManagerOptions } from '~/types/consent-manager';

// Mock localStorage
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: (key: string) => store[key] || null,
		setItem: (key: string, value: string) => {
			store[key] = value.toString();
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			store = {};
		},
	};
})();

Object.defineProperty(window, 'localStorage', {
	value: localStorageMock,
});

const optInOptions: ConsentManagerOptions = {
	mode: 'offline',
};

describe('models Prop E2E Tests', () => {
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
		clearConsentRuntimeCache();
		clearConsentState();
	});

	describe('Opt-in mode (default)', () => {
		test('ConsentBanner renders in opt-in mode (default models includes opt-in)', async () => {
			render(
				<ConsentManagerProvider options={optInOptions}>
					<ConsentBanner />
				</ConsentManagerProvider>
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

		test('IABConsentBanner does NOT render in opt-in mode (default models is iab)', async () => {
			render(
				<ConsentManagerProvider options={optInOptions}>
					<IABConsentBanner />
				</ConsentManagerProvider>
			);

			// Wait long enough to confirm it doesn't appear
			await new Promise((resolve) => setTimeout(resolve, 1000));

			const banner = document.querySelector(
				'[data-testid="iab-consent-banner-card"]'
			);
			expect(banner).not.toBeInTheDocument();
		});

		test('ConsentDialog renders in opt-in mode when open', async () => {
			render(
				<ConsentManagerProvider options={optInOptions}>
					<ConsentDialog open={true} />
				</ConsentManagerProvider>
			);

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

		test('IABConsentDialog does NOT render in opt-in mode', async () => {
			render(
				<ConsentManagerProvider options={optInOptions}>
					<IABConsentDialog open={true} />
				</ConsentManagerProvider>
			);

			await new Promise((resolve) => setTimeout(resolve, 1000));

			const dialog = document.querySelector(
				'[data-testid="iab-consent-dialog-root"]'
			);
			expect(dialog).not.toBeInTheDocument();
		});
	});

	describe('IAB mode', () => {
		test('IABConsentBanner renders when model is iab', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const banner = document.querySelector(
						'[data-testid="iab-consent-banner-card"]'
					);
					expect(banner).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('ConsentBanner does NOT render when model is iab', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<ConsentBanner />
				</ConsentManagerProvider>
			);

			await new Promise((resolve) => setTimeout(resolve, 1000));

			const banner = document.querySelector(
				'[data-testid="consent-banner-root"]'
			);
			expect(banner).not.toBeInTheDocument();
		});
	});

	describe('Custom models prop', () => {
		test('ConsentBanner with models=[opt-in] renders in opt-in mode', async () => {
			render(
				<ConsentManagerProvider options={optInOptions}>
					<ConsentBanner models={['opt-in']} />
				</ConsentManagerProvider>
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

		test('ConsentBanner with models=[iab] does NOT render in opt-in mode', async () => {
			render(
				<ConsentManagerProvider options={optInOptions}>
					<ConsentBanner models={['iab']} />
				</ConsentManagerProvider>
			);

			await new Promise((resolve) => setTimeout(resolve, 1000));

			const banner = document.querySelector(
				'[data-testid="consent-banner-root"]'
			);
			expect(banner).not.toBeInTheDocument();
		});

		test('only matching component renders when both are present', async () => {
			render(
				<ConsentManagerProvider options={optInOptions}>
					<ConsentBanner />
					<IABConsentBanner />
				</ConsentManagerProvider>
			);

			// Standard banner should render
			await vi.waitFor(
				() => {
					const banner = document.querySelector(
						'[data-testid="consent-banner-root"]'
					);
					expect(banner).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);

			// IAB banner should NOT render
			const iabBanner = document.querySelector(
				'[data-testid="iab-consent-banner-card"]'
			);
			expect(iabBanner).not.toBeInTheDocument();
		});
	});
});
