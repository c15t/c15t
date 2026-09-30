/**
 * `disableAnimation` on the provider stops the floating trigger's hover and
 * snap transitions, as it stops the banner's and the dialog's.
 */
import '@c15t/ui/styles.css';
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { ComponentFixtureProvider as ConsentProvider } from '~/__tests__/component-fixture-provider';
import {
	ConsentDialogTrigger,
	ConsentDialogTriggerToolbar,
} from '~/components/panel-trigger';
import { offline } from '~/transports/offline';

const longestTransition = (element: Element | null): number =>
	element
		? Math.max(
				...getComputedStyle(element)
					.transitionDuration.split(',')
					.map((value) => Number.parseFloat(value))
			)
		: Number.NaN;

describe.each([false, true])('disableAnimation %s', (disableAnimation) => {
	test('sets the trigger and toolbar motion', async () => {
		const { unmount } = await render(
			<ConsentProvider options={{ disableAnimation, mode: offline() }}>
				<ConsentDialogTrigger showWhen="always" />
				<ConsentDialogTriggerToolbar showWhen="always" />
			</ConsentProvider>
		);
		const trigger = () =>
			document.querySelector('[data-testid="consent-dialog-trigger"]');
		const toolbar = () => document.querySelector('[role="toolbar"]');
		await vi.waitFor(() => {
			expect(trigger()).not.toBeNull();
			expect(toolbar()).not.toBeNull();
		});

		for (const element of [trigger(), toolbar()]) {
			expect(element?.hasAttribute('data-disable-animation')).toBe(
				disableAnimation
			);
		}
		const item = toolbar()?.querySelector('[data-c15t-trigger-item]') ?? null;
		if (disableAnimation) {
			expect(longestTransition(trigger())).toBe(0);
			expect(longestTransition(item)).toBe(0);
		} else {
			expect(longestTransition(trigger())).toBeGreaterThan(0);
		}
		unmount();
	});
});
