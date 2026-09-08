import type { ConsentPresentation, KernelConfig } from '@c15t/core';
import { custom } from '@c15t/core';
import { render } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';

import Fixture from './fixtures/variant-banner-fixture.svelte';
import { policyFixture } from './policy-fixture';

const required = <Value>(value: Value | null | undefined): Value => {
	if (value === null || value === undefined) {
		throw new Error('Expected a rendered element');
	}
	return value;
};
const query = <Element extends HTMLElement>(selector: string) =>
	document.querySelector<Element>(selector);
const root = () => required(query('[data-testid="consent-banner-root"]'));
const card = () => required(query('[data-testid="consent-banner-card"]'));
const overlay = () => query('[data-testid="consent-banner-overlay"]');

const renderFixture = (
	prefetch: KernelConfig,
	props: {
		variant?: 'floating' | 'bar' | 'widget' | 'wall';
		position?:
			| 'bottom-left'
			| 'bottom-right'
			| 'top-left'
			| 'top-right'
			| 'bottom-center'
			| 'top-center'
			| 'top'
			| 'bottom'
			| 'center';
		blocking?: boolean;
		presentation?: ConsentPresentation;
	} = {}
) => {
	const { presentation, ...bannerProps } = props;
	return render(Fixture, {
		options: {
			disableAnimation: true,
			mode: custom({}),
			persistence: false,
			prefetch,
			presentation,
		},
		...bannerProps,
	});
};
const choice = () => policyFixture();
const notice = () => policyFixture({}, { model: 'opt-out', prompt: 'notice' });
const rtl = (prefetch: KernelConfig): KernelConfig => ({
	...prefetch,
	initialTranslations: { language: 'he', translations: {} },
});

describe('banner variants', () => {
	test('a choice prompt defaults to a floating bottom-left card', () => {
		const view = renderFixture(choice());
		expect(root().dataset.variant).toBe('floating');
		expect(root().dataset.position).toBe('bottom-left');
		expect(root().dataset.blocking).toBeUndefined();
		expect(overlay()).toBeNull();
		view.unmount();
	});

	test('a notice defaults to a floating card and is never blocking', () => {
		const view = renderFixture(notice(), { blocking: true });
		expect(root().dataset.variant).toBe('floating');
		expect(root().dataset.position).toBe('bottom-left');
		expect(root().dataset.blocking).toBeUndefined();
		expect(overlay()).toBeNull();
		expect(card().getAttribute('aria-modal')).toBeNull();
		expect(card().getAttribute('role')).toBe('region');
		expect(card().getAttribute('tabindex')).toBe('-1');
		view.unmount();
	});

	test('a wall blocks: backdrop, modal semantics, centered', () => {
		const view = renderFixture(choice(), { variant: 'wall' });
		expect(root().dataset.variant).toBe('wall');
		expect(root().dataset.position).toBe('center');
		expect(root().dataset.blocking).toBe('true');
		expect(overlay()).not.toBeNull();
		expect(card().getAttribute('role')).toBe('dialog');
		expect(card().getAttribute('aria-modal')).toBe('true');
		view.unmount();
	});

	test('blocking on a floating prompt adds the backdrop', () => {
		const view = renderFixture(choice(), { blocking: true });
		expect(root().dataset.variant).toBe('floating');
		expect(root().dataset.blocking).toBe('true');
		expect(overlay()).not.toBeNull();
		view.unmount();
	});

	test('a defaulted corner mirrors for right-to-left text', () => {
		const view = renderFixture(rtl(choice()));
		expect(root().getAttribute('dir')).toBe('rtl');
		expect(root().dataset.position).toBe('bottom-right');
		view.unmount();
	});

	test('a host corner stays put for right-to-left text', () => {
		const view = renderFixture(rtl(choice()), { position: 'bottom-left' });
		expect(root().dataset.position).toBe('bottom-left');
		view.unmount();
	});

	test('a notice renders as a bottom bar when the host asks for one', () => {
		const view = renderFixture(notice(), { variant: 'bar' });
		expect(root().dataset.variant).toBe('bar');
		expect(root().dataset.position).toBe('bottom');
		expect(root().dataset.blocking).toBeUndefined();
		view.unmount();
	});

	test('a bar edge is not mirrored for right-to-left text', () => {
		const view = renderFixture(rtl(notice()), { variant: 'bar' });
		expect(root().dataset.variant).toBe('bar');
		expect(root().dataset.position).toBe('bottom');
		view.unmount();
	});

	test('props override the host presentation', () => {
		const view = renderFixture(choice(), {
			presentation: { prompt: { position: 'top', variant: 'bar' } },
			variant: 'widget',
		});
		expect(root().dataset.variant).toBe('widget');
		expect(root().dataset.position).toBe('bottom-right');
		view.unmount();
	});

	test('the host presentation applies when no prop is set', () => {
		const view = renderFixture(choice(), {
			presentation: { prompt: { position: 'top', variant: 'bar' } },
		});
		expect(root().dataset.variant).toBe('bar');
		expect(root().dataset.position).toBe('top');
		view.unmount();
	});

	test('an invalid position falls back to the variant default', () => {
		const view = renderFixture(choice(), {
			position: 'top-left',
			variant: 'bar',
		});
		expect(root().dataset.variant).toBe('bar');
		expect(root().dataset.position).toBe('bottom');
		view.unmount();
	});
});
