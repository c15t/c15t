import { defaultTranslationConfig } from '@c15t/core';
import type { ReactElement } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { Frame } from '~/components/frame';
import { ConsentProvider } from '~/provider';
import { offline } from '~/transports/offline';

const renderFrame = function renderFrame(
	ui: ReactElement,
	consents: Record<string, boolean>
) {
	return render(
		<ConsentProvider
			options={{
				mode: offline(),
				persistence: false,
				prefetch: {
					initialConsents: consents,
					initialPolicy: {
						consent: {
							categories: ['necessary', 'marketing'],
							scopeMode: 'permissive',
						},
						id: 'frame-test-policy',
						model: 'opt-in',
						ui: { banner: {}, dialog: {}, mode: 'banner' },
					},
					initialTranslations: {
						language: 'en',
						translations: defaultTranslationConfig.translations.en,
					},
				},
			}}
		>
			{ui}
		</ConsentProvider>
	);
};

describe('Frame default placeholder', () => {
	test('renders the shared placeholder slots when consent is missing', async () => {
		const { container } = await renderFrame(
			<Frame category="marketing">
				<div data-testid="frame-content">Marketing content</div>
			</Frame>,
			{ marketing: false, necessary: true }
		);

		await vi.waitFor(() => {
			const placeholder = container.querySelector(
				'[data-testid="frame-placeholder"]'
			);
			expect(placeholder).toBeInTheDocument();

			const button = placeholder?.querySelector(
				'[data-testid="frame-open-dialog"]'
			);
			expect(button).toBeInTheDocument();
			// The category title comes from the translation bundle, not the
			// raw category key.
			expect(placeholder).toHaveTextContent('Marketing');
			expect(
				container.querySelector('[data-testid="frame-content"]')
			).toBeNull();
		});
	});

	test('a supplied placeholder replaces the default slots', async () => {
		const { container } = await renderFrame(
			<Frame
				category="marketing"
				placeholder={<div data-testid="custom-placeholder">Blocked</div>}
			>
				<div data-testid="frame-content">Marketing content</div>
			</Frame>,
			{ marketing: false, necessary: true }
		);

		await vi.waitFor(() => {
			expect(
				container.querySelector('[data-testid="custom-placeholder"]')
			).toBeInTheDocument();
			expect(
				container.querySelector('[data-testid="frame-placeholder"]')
			).toBeNull();
			expect(
				container.querySelector('[data-testid="frame-open-dialog"]')
			).toBeNull();
		});
	});
});
