/**
 * The render-blocking `styles.css` no longer carries the dialog's rules. The
 * dialog's lazy module imports `@c15t/ui/styles/dialog.css`, so the bundler
 * ships the rules with the dialog chunk and applies them before that module
 * runs. These tests fail if the import goes missing (the dialog would render
 * unstyled) or if the dialog rules drift back into `styles.css`.
 */
import '@c15t/ui/styles.css';
import panelStyles from '@c15t/ui/styles/components/consent-dialog';
import { createRoot } from 'react-dom/client';
import { expect, test, vi } from 'vitest';

import { ConsentDialog } from '../aggregate-components';
import { ConsentProvider } from '../provider';
import { offline } from '../transports/offline';
import { policyFixture } from './policy-fixture';

// ── Static import graph of the built package ─────────────────────────
// What a consumer's bundler sees: `import`/`export … from` edges only.
// Dynamic `import()` starts a lazy chunk and is not followed.

const DIST = import.meta.glob<string>('../../dist/**/*.js', {
	eager: true,
	import: 'default',
	query: '?raw',
});
const DIALOG_CSS = '@c15t/ui/styles/dialog.css';
/** Class maps whose rules live in `@c15t/ui/styles/dialog.css`. */
const DIALOG_CLASS_MAPS = [
	'accordion',
	'collapsible',
	'consent-dialog',
	'consent-manager',
	'preference-item',
	'switch',
	'tabs',
	'vendor-list',
].map((name) => `@c15t/ui/styles/components/${name}`);

const staticImports = (source: string): string[] =>
	[
		...source.matchAll(
			/(?:^|[;\s}])(?:import|export)\s*(?:[\w$*{}\s,]*?from\s*)?["'](?<specifier>[^"']+)["']/gu
		),
	].map((match) => match.groups?.specifier ?? '');

const resolveDist = (from: string, specifier: string): string | undefined => {
	if (!specifier.startsWith('.')) {
		return undefined;
	}
	const parts = from.split('/').slice(0, -1);
	for (const part of specifier.split('/')) {
		if (part === '..') {
			parts.pop();
		} else if (part !== '.') {
			parts.push(part);
		}
	}
	const path = parts.join('/');
	return path in DIST ? path : undefined;
};

/** Every module and bare specifier reachable from `entry` without `import()`. */
const reachable = (entry: string): Set<string> => {
	const seen = new Set<string>();
	const queue = [`../../dist/${entry}`];
	while (queue.length > 0) {
		const file = queue.pop() as string;
		if (seen.has(file)) {
			continue;
		}
		seen.add(file);
		for (const specifier of staticImports(DIST[file] ?? '')) {
			const local = resolveDist(file, specifier);
			if (local) {
				queue.push(local);
			} else if (!specifier.startsWith('.')) {
				seen.add(specifier);
			}
		}
	}
	return seen;
};

test('the built package is available to inspect', () => {
	expect(Object.keys(DIST).length).toBeGreaterThan(50);
	expect(DIST['../../dist/index.js']).toBeDefined();
});

// Entries a page loads before any dialog opens.
test.each([
	'index.js',
	'prompt.js',
	'panel-trigger.js',
	'panel-link.js',
	'consent-gate.js',
	'hooks.js',
	'headless.js',
])('%s keeps the dialog stylesheet out of first load', (entry) => {
	const graph = reachable(entry);
	expect(graph.has(DIALOG_CSS)).toBe(false);
	expect(DIALOG_CLASS_MAPS.filter((map) => graph.has(map))).toEqual([]);
});

// Entries that render dialog classes: each must bring the dialog stylesheet.
test.each([
	'components/panel/index.js',
	'components/preferences/index.js',
	'panel.js',
	'preferences.js',
	'primitives.js',
	'iab.js',
])('%s imports the dialog stylesheet', (entry) => {
	const graph = reachable(entry);
	expect(DIALOG_CLASS_MAPS.some((map) => graph.has(map))).toBe(true);
	expect(graph.has(DIALOG_CSS)).toBe(true);
});

test('the aggregate ConsentDialog reaches the dialog stylesheet only through import()', () => {
	const source = DIST['../../dist/aggregate-components.js'] ?? '';
	expect(source).toContain('import("./components/panel/index.js")');
	expect(reachable('aggregate-components.js').has(DIALOG_CSS)).toBe(false);
});

// ── Runtime: styles arrive with the lazy dialog ──────────────────────

interface CardStyle {
	display: string;
	position: string;
}

const cardStyle = (element: Element): CardStyle => {
	const style = getComputedStyle(element);
	return { display: style.display, position: style.position };
};

/** `.card` in panel.module.css: `position: relative; display: flex`. */
const STYLED_CARD: CardStyle = { display: 'flex', position: 'relative' };

test('styles.css leaves the dialog card unstyled', () => {
	const probe = document.createElement('div');
	probe.className = panelStyles.card ?? '';
	document.body.append(probe);
	try {
		expect(panelStyles.card).toBeTruthy();
		expect(cardStyle(probe)).toEqual({ display: 'block', position: 'static' });
	} finally {
		probe.remove();
	}
});

test('the lazy dialog brings its stylesheet before it renders', async () => {
	const container = document.createElement('div');
	document.body.append(container);
	const root = createRoot(container);

	// Record the card's style synchronously on insertion, before the browser
	// can paint it.
	let atInsertion: CardStyle | undefined;
	const observer = new MutationObserver(() => {
		const card = document.querySelector('[data-testid="consent-dialog-card"]');
		if (card && !atInsertion) {
			atInsertion = cardStyle(card);
		}
	});
	observer.observe(document.body, { childList: true, subtree: true });

	try {
		root.render(
			<ConsentProvider
				options={{
					mode: offline(),
					persistence: false,
					prefetch: policyFixture(),
				}}
			>
				<ConsentDialog
					disableAnimation
					open
				/>
			</ConsentProvider>
		);
		await vi.waitFor(() => expect(atInsertion).toBeDefined());
		expect(atInsertion).toEqual(STYLED_CARD);
	} finally {
		observer.disconnect();
		root.unmount();
		container.remove();
	}
});
