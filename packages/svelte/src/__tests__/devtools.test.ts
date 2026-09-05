import { render } from '@testing-library/svelte';
import { describe, expect, test, vi } from 'vitest';

import ConsentDevToolsDefault, {
	C15TDevTools,
	ConsentDevTools,
	DevTools,
} from '../lib/devtools';
import DevToolsFixture from './fixtures/devtools-fixture.svelte';

const mountedDevTools = (): NodeListOf<HTMLElement> =>
	document.querySelectorAll('[data-c15t-dev-tools]');

describe('@c15t/svelte/devtools', () => {
	test('keeps explicit service callbacks live without remounting', async () => {
		const firstClear = vi.fn();
		const nextClear = vi.fn();
		const result = render(DevToolsFixture, {
			clearRecords: firstClear,
			getPresentation: () => undefined,
			presentation: { preferences: { primaryActions: ['accept'] } },
		});
		try {
			await vi.waitFor(() => expect(mountedDevTools()).toHaveLength(1));
			const [root] = mountedDevTools();
			root?.querySelector<HTMLButtonElement>('[data-tab="policy"]')?.click();
			expect(root?.textContent).toContain('Resolved defaults only');
			await result.rerender({
				clearRecords: nextClear,
				getPresentation: () => undefined,
			});
			expect(mountedDevTools()[0]).toBe(root);
			root?.querySelector<HTMLButtonElement>('[data-tab="actions"]')?.click();
			[...(root?.querySelectorAll('button') ?? [])]
				.find((button) => button.textContent === 'Clear stored records')
				?.click();
			expect(firstClear).not.toHaveBeenCalled();
			expect(nextClear).toHaveBeenCalledOnce();
		} finally {
			result.unmount();
		}
	});

	test('uses provider presentation and clears its custom persistence key', async () => {
		const storageKey = 'svelte-devtools-clear';
		const result = render(DevToolsFixture, {
			presentation: { preferences: { primaryActions: ['accept'] } },
			storageKey,
		});
		try {
			await vi.waitFor(() => expect(mountedDevTools()).toHaveLength(1));
			mountedDevTools()[0]
				?.querySelector<HTMLButtonElement>('[data-tab="policy"]')
				?.click();
			expect(mountedDevTools()[0]?.textContent).toContain('host-options');
			expect(mountedDevTools()[0]?.textContent).toContain(
				'equivalent-prominence-overridden'
			);
			const click = (label: string) => {
				const button = [
					...(mountedDevTools()[0]?.querySelectorAll('button') ?? []),
				].find((element) => element.textContent === label);
				expect(button).toBeDefined();
				button?.click();
			};
			mountedDevTools()[0]
				?.querySelector<HTMLButtonElement>('[data-tab="consents"]')
				?.click();
			click('Accept all');
			await vi.waitFor(() =>
				expect(localStorage.getItem(storageKey)).not.toBeNull()
			);
			await vi.waitFor(() =>
				expect(
					mountedDevTools()[0]?.querySelector('[role="status"]')?.textContent
				).toContain('accepted')
			);
			mountedDevTools()[0]
				?.querySelector<HTMLButtonElement>('[data-tab="actions"]')
				?.click();
			click('Clear stored records');
			await vi.waitFor(() =>
				expect(localStorage.getItem(storageKey)).toBeNull()
			);
			mountedDevTools()[0]
				?.querySelector<HTMLButtonElement>('[data-tab="policy"]')
				?.click();
			expect(mountedDevTools()[0]?.textContent).toContain('Absent');
		} finally {
			result.unmount();
			localStorage.removeItem(storageKey);
			document.cookie = `${storageKey}=; Max-Age=0; Path=/`;
		}
	});

	test('uses the canonical wildcard scope for a necessary-only authored policy', async () => {
		const result = render(DevToolsFixture, {
			categories: ['necessary', 'marketing'],
			policyCategories: ['necessary'],
		});
		try {
			await vi.waitFor(() => expect(mountedDevTools()).toHaveLength(1));
			expect(
				document.querySelector('[data-focus-key="consent:marketing"]')
			).not.toBeNull();
			expect(
				document.querySelector('[data-focus-key="consent:measurement"]')
			).toBeNull();
		} finally {
			result.unmount();
		}
	});
	test('intersects configured categories with the active policy in the inspector', async () => {
		const result = render(DevToolsFixture, {
			categories: ['necessary', 'marketing', 'measurement'],
			policyCategories: ['necessary', 'marketing'],
		});
		try {
			await vi.waitFor(() =>
				expect(
					document.querySelector('[data-focus-key="consent:marketing"]')
				).not.toBeNull()
			);
			expect(
				document.querySelector('[data-focus-key="consent:measurement"]')
			).toBeNull();
		} finally {
			result.unmount();
		}
	});
	test.each(['getter', 'provider'] as const)(
		'updates displayed categories when the %s scope changes',
		async (source) => {
			const first = ['necessary', 'marketing'] as const;
			const second = ['necessary', 'measurement'] as const;
			const result = render(DevToolsFixture, {
				policyCategories: ['necessary', 'marketing', 'measurement'],
				...(source === 'getter'
					? { getConsentCategories: () => first }
					: { categories: [...first] }),
			});
			await vi.waitFor(() =>
				expect(
					document.querySelector('[data-focus-key="consent:marketing"]')
				).not.toBeNull()
			);
			await result.rerender(
				source === 'getter'
					? { getConsentCategories: () => second }
					: { categories: [...second] }
			);
			await vi.waitFor(() => {
				expect(
					document.querySelector('[data-focus-key="consent:measurement"]')
				).not.toBeNull();
				expect(
					document.querySelector('[data-focus-key="consent:marketing"]')
				).toBeNull();
			});
			const [root] = mountedDevTools();
			document
				.querySelector<HTMLInputElement>(
					'[data-focus-key="consent:measurement"]'
				)
				?.click();
			await vi.waitFor(() =>
				expect(
					document.querySelector<HTMLInputElement>(
						'[data-focus-key="consent:measurement"]'
					)?.checked
				).toBe(true)
			);
			expect(mountedDevTools()[0]).toBe(root);
			expect(mountedDevTools()).toHaveLength(1);
			result.unmount();
		}
	);
	test('updates presentation options without leaving duplicate instances', async () => {
		const result = render(DevToolsFixture, { position: 'top-left' });
		await vi.waitFor(() =>
			expect(document.querySelector('.c15t-dev-tools--top-left')).not.toBeNull()
		);
		await result.rerender({ position: 'bottom-left' });
		await vi.waitFor(() =>
			expect(
				document.querySelector('.c15t-dev-tools--bottom-left')
			).not.toBeNull()
		);
		expect(mountedDevTools()).toHaveLength(1);
		result.unmount();
	});
	test('exports compatible component names', () => {
		expect(ConsentDevToolsDefault).toBe(ConsentDevTools);
		expect(DevTools).toBe(ConsentDevTools);
		expect(C15TDevTools).toBe(ConsentDevTools);
	});

	test('requires Svelte consent provider context', () => {
		expect(() => render(ConsentDevTools)).toThrow('no v3 consent context');
	});

	test('mounts and disposes an isolated engine for each provider', async () => {
		const result = render(DevToolsFixture, { multiple: true });

		await vi.waitFor(() => {
			expect(mountedDevTools()).toHaveLength(2);
		});
		expect(document.querySelector('.c15t-dev-tools--top-left')).not.toBeNull();
		expect(
			document.querySelector('.c15t-dev-tools--bottom-right')
		).not.toBeNull();

		result.unmount();
		expect(mountedDevTools()).toHaveLength(0);
	});
});
