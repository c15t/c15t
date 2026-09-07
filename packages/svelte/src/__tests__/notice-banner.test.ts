import { custom } from '@c15t/core';
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
	test('renders the translated dismiss as the primary and only action', () => {
		const { view } = renderFixture(notice());
		const dismiss = required(
			query<HTMLButtonElement>('[data-testid="consent-banner-dismiss-button"]')
		);
		expect(dismiss.dataset.action).toBe('dismiss');
		expect(dismiss.textContent?.trim()).toBe('Dismiss');
		expect(dismiss.dataset.variant).toBe('primary');
		expect(document.querySelectorAll('[data-action]')).toHaveLength(1);
		view.unmount();
	});

	test('renders opt-out and preferences links before the actions', () => {
		const { view } = renderFixture(notice());
		const root = required(query('[data-testid="consent-banner-root"]'));
		expect(root.dataset.prompt).toBe('notice');
		expect(root.dataset.model).toBe('opt-out');
		const rights = required(query('[data-testid="consent-banner-rights"]'));
		const links = [...rights.querySelectorAll('button[data-right]')];
		expect(links.map((link) => link.getAttribute('data-right'))).toEqual([
			'opt-out',
			'preferences',
		]);
		expect(links[0]?.textContent?.trim()).toBe(
			'Do not sell or share my personal information'
		);
		expect(links[1]?.textContent?.trim()).toBe('Manage preferences');
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
		await fireEvent.click(
			required(query('[data-testid="consent-banner-right-link-opt-out"]'))
		);
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
