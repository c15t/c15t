/**
 * `ConsentDialog` from the package entry loads the dialog on first use.
 *
 * The static import graph of the entry must not reach the dialog or the
 * preference widget, so neither is in a page's first load. Opening still
 * works, and hover, focus and idle time load it before the first open.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
	holdIdleDialogWarming,
	registerDialogWarmer,
	resetDialogWarmingForTests,
	warmDialog,
} from '../lib/dialog-warming';
import DeferredDialogFixture from './fixtures/deferred-dialog-fixture.svelte';
import DeferredDialogTriggerFixture from './fixtures/deferred-dialog-trigger-fixture.svelte';
import { testOffline } from './test-offline';

const LIB = resolve(__dirname, '../lib');

/** Relative modules `file` imports statically (type-only imports excluded). */
const staticImports = function staticImports(file: string): string[] {
	const source = readFileSync(file, 'utf8');
	const specifiers: string[] = [];
	const pattern =
		/(?:^|\n)\s*(?:import|export)\s+(?!type\b)(?:[^'";]*?\sfrom\s+)?['"](?<specifier>\.[^'"]+)['"]/gu;
	for (const match of source.matchAll(pattern)) {
		const { specifier } = match.groups ?? {};
		if (specifier) {
			specifiers.push(specifier);
		}
	}
	return specifiers;
};

const resolveModule = function resolveModule(
	from: string,
	specifier: string
): string | null {
	const base = resolve(dirname(from), specifier);
	for (const candidate of [base, `${base}.ts`, `${base}/index.ts`]) {
		try {
			readFileSync(candidate);
			return candidate;
		} catch {
			// try the next candidate
		}
	}
	return null;
};

const reachableFrom = function reachableFrom(entry: string): Set<string> {
	const seen = new Set<string>();
	const queue = [entry];
	while (queue.length > 0) {
		const file = queue.pop() as string;
		if (seen.has(file)) {
			continue;
		}
		seen.add(file);
		for (const specifier of staticImports(file)) {
			const next = resolveModule(file, specifier);
			if (next) {
				queue.push(next);
			}
		}
	}
	return seen;
};

describe('ConsentDialog first load', () => {
	test('the package entry exports the deferred dialog', () => {
		expect(readFileSync(resolve(LIB, 'index.ts'), 'utf8')).toContain(
			"export { default as ConsentDialog } from './components/deferred-panel.svelte';"
		);
	});

	// Unused exports such as `ConsentWidget` are dropped by the bundler
	// (`sideEffects` covers only CSS), so the modules a page renders with a
	// banner, a dialog and a dialog link are what must stay clear.
	test.each([
		'components/deferred-panel.svelte',
		'components/prompt.svelte',
		'components/panel-link.svelte',
		'components/panel-trigger.svelte',
		'components/manager-provider.svelte',
	])('%s does not statically reach the dialog', (entry) => {
		const reachable = reachableFrom(resolve(LIB, entry));

		expect(reachable).not.toContain(resolve(LIB, 'components/panel.svelte'));
		expect(reachable).not.toContain(
			resolve(LIB, 'components/preferences.svelte')
		);
		expect(reachable).not.toContain(
			resolve(LIB, 'components/vendor-list.svelte')
		);
	});
});

describe('deferred ConsentDialog', () => {
	beforeEach(() => {
		window.localStorage.clear();
		resetDialogWarmingForTests();
	});

	test('opens from the banner Customize button', async () => {
		render(DeferredDialogFixture, {
			options: { mode: testOffline(), preloadDialog: 'intent' },
		});
		const customize = await waitFor(() => {
			const button = document.querySelector(
				'[data-testid="consent-banner-customize-button"]'
			);
			expect(button).toBeInTheDocument();
			return button as HTMLElement;
		});
		expect(
			document.querySelector('[data-testid="consent-dialog-card"]')
		).toBeNull();

		await fireEvent.click(customize);

		await waitFor(() => {
			expect(
				document.querySelector('[data-testid="consent-dialog-card"]')
			).toBeInTheDocument();
		});
	});

	test('loads at once to render its own trigger', async () => {
		render(DeferredDialogTriggerFixture, {
			options: { mode: testOffline(), preloadDialog: 'intent' },
		});
		const trigger = await waitFor(() => {
			const button = document.querySelector(
				'[data-testid="consent-dialog-trigger"]'
			);
			expect(button).toBeInTheDocument();
			return button as HTMLElement;
		});

		await fireEvent.click(trigger);

		await waitFor(() => {
			expect(
				document.querySelector('[data-testid="consent-dialog-card"]')
			).toBeInTheDocument();
		});
	});

	test('opens from ConsentDialogLink', async () => {
		render(DeferredDialogFixture, {
			options: { mode: testOffline(), preloadDialog: 'intent' },
		});
		const link = await waitFor(() => {
			const button = document.querySelector(
				'[data-testid="consent-dialog-link"]'
			);
			expect(button).toBeInTheDocument();
			return button as HTMLElement;
		});

		await fireEvent.click(link);

		await waitFor(() => {
			expect(
				document.querySelector('[data-testid="consent-dialog-card"]')
			).toBeInTheDocument();
		});
	});
});

describe('dialog warming', () => {
	const idleCallbacks: (() => void)[] = [];
	const runIdleCallbacks = () => {
		for (const idle of idleCallbacks) {
			idle();
		}
	};

	beforeEach(() => {
		resetDialogWarmingForTests();
		idleCallbacks.length = 0;
		vi.stubGlobal('requestIdleCallback', (idle: () => void) => {
			idleCallbacks.push(idle);
			return idleCallbacks.length;
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test('loads in idle time while an opener is mounted', () => {
		const warmer = vi.fn();
		registerDialogWarmer(warmer);

		const release = holdIdleDialogWarming('idle');
		expect(warmer).not.toHaveBeenCalled();
		runIdleCallbacks();

		expect(warmer).toHaveBeenCalledTimes(1);
		release();
	});

	test('skips idle loading once every opener is gone', () => {
		const warmer = vi.fn();
		registerDialogWarmer(warmer);

		holdIdleDialogWarming('idle')();
		runIdleCallbacks();

		expect(warmer).not.toHaveBeenCalled();
	});

	test("preloadDialog: 'intent' loads on hover or focus only", () => {
		const warmer = vi.fn();
		registerDialogWarmer(warmer);

		holdIdleDialogWarming('intent');
		expect(idleCallbacks).toHaveLength(0);

		warmDialog();
		expect(warmer).toHaveBeenCalledTimes(1);
	});

	test('skips idle loading when the visitor asked to save data', () => {
		vi.stubGlobal('navigator', {
			...navigator,
			connection: { saveData: true },
			onLine: true,
		});
		const warmer = vi.fn();
		registerDialogWarmer(warmer);

		holdIdleDialogWarming('idle');

		expect(idleCallbacks).toHaveLength(0);
		expect(warmer).not.toHaveBeenCalled();
	});

	test('a dialog that mounts after an intent signal loads at once', () => {
		warmDialog();
		const warmer = vi.fn();

		registerDialogWarmer(warmer);

		expect(warmer).toHaveBeenCalledTimes(1);
	});
});
