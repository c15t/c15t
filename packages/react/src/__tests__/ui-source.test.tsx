import type { SavePayload } from '@c15t/core';
import { resolvePolicyRules } from '@c15t/schema/types';
import { createRoot } from 'react-dom/client';
import { expect, test, vi } from 'vitest';

import { useConsentManager } from '../component-hooks/use-manager';
import { ConsentWidget } from '../components/preferences';
import { ConsentProvider } from '../provider';

const resolution = resolvePolicyRules({
	countryCode: null,
	regionCode: null,
	rules: [
		{
			categories: ['marketing', 'measurement'],
			id: 'react-ui-source',
			match: { isDefault: true },
			model: 'opt-in',
			prompt: 'choice',
			scopeMode: 'permissive',
		},
	],
});

const mount = function mount(children: React.ReactNode) {
	const save = vi.fn().mockResolvedValue({ ok: true });
	const container = document.createElement('div');
	document.body.append(container);
	const view = createRoot(container);
	view.render(
		<ConsentProvider
			options={{
				enabled: true,
				mode: Object.assign(() => ({ save }), { kind: 'custom' as const }),
				persistence: false,
				prefetch: { initialPolicyResolution: resolution },
			}}
		>
			{children}
		</ConsentProvider>
	);
	return {
		payload: () => save.mock.calls[0]?.[0] as SavePayload | undefined,
		save,
		unmount() {
			view.unmount();
			container.remove();
		},
	};
};

test('the inline widget attributes its save to the widget, not the banner', async () => {
	const mounted = mount(<ConsentWidget />);
	try {
		await vi.waitFor(() =>
			expect(
				document.querySelector(
					'[data-testid="consent-widget-footer-accept-all-button"]'
				)
			).not.toBeNull()
		);
		document
			.querySelector<HTMLButtonElement>(
				'[data-testid="consent-widget-footer-accept-all-button"]'
			)
			?.click();
		await vi.waitFor(() => expect(mounted.save).toHaveBeenCalledOnce());
		expect(mounted.payload()?.uiSource).toBe('widget');
		expect(mounted.payload()).not.toHaveProperty('timeToDecisionMs');
	} finally {
		mounted.unmount();
	}
});

test('useConsentManager().saveConsents forwards its uiSource option', async () => {
	const Actor = () => {
		const { saveConsents } = useConsentManager();
		return (
			<button
				type="button"
				data-testid="save-widget"
				onClick={() => {
					saveConsents('all', { uiSource: 'widget' }).catch(() => undefined);
				}}
			>
				save
			</button>
		);
	};
	const mounted = mount(<Actor />);
	try {
		await vi.waitFor(() =>
			expect(
				document.querySelector('[data-testid="save-widget"]')
			).not.toBeNull()
		);
		document
			.querySelector<HTMLButtonElement>('[data-testid="save-widget"]')
			?.click();
		await vi.waitFor(() => expect(mounted.save).toHaveBeenCalledOnce());
		expect(mounted.payload()?.uiSource).toBe('widget');
	} finally {
		mounted.unmount();
	}
});
