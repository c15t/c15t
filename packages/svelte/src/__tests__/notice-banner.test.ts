import { custom } from '@c15t/core';
import bannerStyles from '@c15t/ui/styles/components/consent-banner';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';

import type { ConsentContextValue } from '../lib/context.svelte';
import type { ConsentManagerOptions } from '../lib/types';
import Fixture from './fixtures/notice-banner-fixture.svelte';
import { policyFixture } from './policy-fixture';

const required = <Value>(value: Value | null | undefined): Value => {
	if (value === null || value === undefined) {
		throw new Error('Expected a rendered control');
	}
	return value;
};
const captureContext = () => {
	let context: ConsentContextValue;
	return {
		capture(value: ConsentContextValue) {
			context = value;
		},
		get current() {
			return context;
		},
	};
};
const renderFixture = (
	prefetch: ConsentManagerOptions['prefetch'],
	props: {
		title?: string;
		description?: string;
		dismissButtonText?: string;
	} = {}
) => {
	const context = captureContext();
	const view = render(Fixture, {
		capture: context.capture,
		options: {
			disableAnimation: true,
			mode: custom({}),
			persistence: false,
			prefetch,
		},
		...props,
	});
	return { context, view };
};
const query = <Element extends HTMLElement>(selector: string) =>
	document.querySelector<Element>(selector);
const notice = () => policyFixture({}, { model: 'opt-out', prompt: 'notice' });

describe('notice banner', () => {
	test('renders the dismiss as a primary "OK" that records nothing', () => {
		const { view } = renderFixture(notice());
		const dismiss = required(
			query<HTMLButtonElement>('[data-testid="consent-banner-dismiss-button"]')
		);
		expect(dismiss.dataset.action).toBe('dismiss');
		expect(dismiss.textContent?.trim()).toBe('OK');
		expect(dismiss.dataset.variant).toBe('primary');
		expect(
			document.querySelectorAll('[data-action]:not([data-action="right"])')
		).toHaveLength(1);
		view.unmount();
	});

	test('renders a single underlined opt-out link before the primary', () => {
		const { view } = renderFixture(notice());
		const root = required(query('[data-testid="consent-banner-root"]'));
		expect(root.dataset.prompt).toBe('notice');
		expect(root.dataset.model).toBe('opt-out');
		const rights = required(query('[data-testid="consent-banner-rights"]'));
		const buttons = [
			...rights.querySelectorAll<HTMLButtonElement>('button[data-right]'),
		];
		// The opt-out control opens the preference center, so it covers the
		// preferences right too and no second control appears.
		expect(buttons.map((button) => button.dataset.right)).toEqual(['opt-out']);
		const optOut = required(buttons[0]);
		expect(optOut.textContent?.trim()).toBe('Do not sell or share my data');
		expect(optOut.dataset.action).toBe('right');
		expect(optOut.classList.contains(bannerStyles.rightLink)).toBe(true);
		expect(optOut.dataset.variant).toBeUndefined();
		expect(optOut.dataset.mode).toBeUndefined();
		const footer = required(query('[data-testid="consent-banner-footer"]'));
		const dismiss = required(query('[data-action="dismiss"]'));
		expect(footer.contains(rights)).toBe(true);
		const footerChildren = [...footer.children];
		expect(footerChildren.indexOf(rights)).toBeLessThan(
			footerChildren.findIndex((child) => child.contains(dismiss))
		);
		view.unmount();
	});

	test('the opt-out link opens the preference center without a choice', async () => {
		const { context, view } = renderFixture(notice());
		const optOut = required(
			query('[data-testid="consent-banner-right-link-opt-out"]')
		);
		expect(optOut.getAttribute('data-c15t-rights')?.split(' ')).toContain(
			'opt-out'
		);
		await fireEvent.click(optOut);
		await waitFor(() =>
			expect(query('[data-testid="consent-dialog-root"]')).not.toBeNull()
		);
		expect(context.current.state.activeUI).toBe('dialog');
		expect(context.current.snapshot.explicitChoice).toBeNull();
		view.unmount();
	});

	test('uses the notice copy and lets props override it', () => {
		const first = renderFixture(notice());
		expect(
			query('[data-testid="consent-banner-title"]')?.textContent?.trim()
		).toBe('Privacy notice');
		expect(
			query('[data-testid="consent-banner-description"]')?.textContent
		).toContain('You can opt out or manage your preferences at any time.');
		first.view.unmount();

		const second = renderFixture(notice(), {
			description: 'Custom notice body',
			dismissButtonText: 'Got it',
			title: 'Custom notice',
		});
		expect(
			query('[data-testid="consent-banner-title"]')?.textContent?.trim()
		).toBe('Custom notice');
		expect(
			query('[data-testid="consent-banner-description"]')?.textContent
		).toContain('Custom notice body');
		expect(
			query(
				'[data-testid="consent-banner-dismiss-button"]'
			)?.textContent?.trim()
		).toBe('Got it');
		second.view.unmount();
	});

	test('a choice prompt with customize renders no rights group', () => {
		const { view } = renderFixture(policyFixture());
		const root = required(query('[data-testid="consent-banner-root"]'));
		expect(root.dataset.prompt).toBe('choice');
		expect(root.dataset.model).toBe('opt-in');
		expect(
			query('[data-testid="consent-banner-title"]')?.textContent?.trim()
		).toBe('We value your privacy');
		expect(query('[data-testid="consent-banner-rights"]')).toBeNull();
		view.unmount();
	});

	test('a choice prompt without customize renders only the preferences link', () => {
		const { view } = renderFixture(
			policyFixture({}, { actions: ['accept', 'reject'] })
		);
		const links = document.querySelectorAll(
			'[data-testid="consent-banner-rights"] button[data-right]'
		);
		expect([...links].map((link) => link.getAttribute('data-right'))).toEqual([
			'preferences',
		]);
		view.unmount();
	});
});
