/**
 * The render-blocking `styles.css` no longer carries the dialog's rules. The
 * dialog's lazy module imports `@c15t/ui/styles/dialog`, which imports
 * `styles/dialog.css` for bundlers, so the bundler ships the rules with the
 * dialog chunk and applies them before that module runs. Under the `node`
 * condition it imports nothing, so plain Node can load the package. These
 * tests fail if the import goes missing (the dialog would render unstyled),
 * if a module imports the `.css` file directly (plain Node would throw), or
 * if the dialog rules drift back into `styles.css`.
 */
import '@c15t/ui/styles.css';
import panelStyles from '@c15t/ui/styles/components/consent-dialog';
import { createRoot } from 'react-dom/client';
import { expect, test, vi } from 'vitest';

import packageJson from '../../package.json';
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
const DIALOG_CSS = '@c15t/ui/styles/dialog';
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
	// The split entries export the deferred components, which load the
	// dialog code and its stylesheet through import().
	'panel.js',
	'preferences.js',
])('%s keeps the dialog stylesheet out of first load', (entry) => {
	const graph = reachable(entry);
	expect(graph.has(DIALOG_CSS)).toBe(false);
	expect(DIALOG_CLASS_MAPS.filter((map) => graph.has(map))).toEqual([]);
});

// Entries that render dialog classes: each must bring the dialog stylesheet.
test.each([
	'components/panel/index.js',
	'components/preferences/index.js',
	'primitives.js',
	'primitives/accordion.js',
	'primitives/collapsible.js',
	'primitives/preference-item.js',
	'primitives/switch.js',
	'primitives/tabs.js',
	'iab.js',
])('%s imports the dialog stylesheet', (entry) => {
	const graph = reachable(entry);
	expect(DIALOG_CLASS_MAPS.some((map) => graph.has(map))).toBe(true);
	expect(graph.has(DIALOG_CSS)).toBe(true);
});

/** Every `dist/*.js` file a public subpath (wildcards expanded) points at. */
const publicEntries = (): string[] => {
	const entries = new Set<string>();
	for (const target of Object.values(packageJson.exports)) {
		const path =
			typeof target === 'string'
				? target
				: (target as { import?: string }).import;
		if (!path?.endsWith('.js')) {
			continue;
		}
		const [prefix = '', suffix = ''] = path.slice('./dist/'.length).split('*');
		for (const file of Object.keys(DIST)) {
			const relative = file.slice('../../dist/'.length);
			const middle = relative.slice(prefix.length, -suffix.length || undefined);
			const matches = path.includes('*')
				? relative.startsWith(prefix) &&
					relative.endsWith(suffix) &&
					!middle.includes('/')
				: relative === prefix;
			if (matches) {
				entries.add(relative);
			}
		}
	}
	return [...entries].sort();
};

test('every public entry that renders dialog classes brings the dialog stylesheet', () => {
	const entries = publicEntries();
	expect(entries).toContain('primitives/accordion.js');
	const missing = entries.filter((entry) => {
		const graph = reachable(entry);
		return (
			DIALOG_CLASS_MAPS.some((map) => graph.has(map)) && !graph.has(DIALOG_CSS)
		);
	});
	expect(missing).toEqual([]);
});

/** Class maps of the primitives the `/primitives` entries export. */
const PRIMITIVE_CLASS_MAPS = [
	'accordion',
	'collapsible',
	'preference-item',
	'switch',
	'tabs',
].map((name) => `@c15t/ui/styles/components/${name}`);

// Only `**/*.css` is marked side-effectful, so bundlers (Turbopack, webpack)
// skip a module that only re-exports, together with any stylesheet import in
// it. The import has to sit in the module that uses the classes.
test('each primitive that uses dialog classes imports the dialog stylesheet itself', () => {
	const users = Object.entries(DIST).filter(
		([file, source]) =>
			file.startsWith('../../dist/components/shared/ui/') &&
			staticImports(source).some((specifier) =>
				PRIMITIVE_CLASS_MAPS.includes(specifier)
			)
	);

	expect(users.length).toBeGreaterThanOrEqual(PRIMITIVE_CLASS_MAPS.length);
	expect(
		users
			.filter(([, source]) => !staticImports(source).includes(DIALOG_CSS))
			.map(([file]) => file)
	).toEqual([]);
});

test('no re-export-only module carries the dialog stylesheet import', () => {
	expect(packageJson.sideEffects).toEqual(['**/*.css']);
	const reExportOnly = Object.entries(DIST)
		.filter(([, source]) => staticImports(source).includes(DIALOG_CSS))
		.filter(([, source]) =>
			source
				.replace(`import"${DIALOG_CSS}";`, '')
				.split(';')
				.every(
					(statement) =>
						statement.trim() === '' ||
						/^(?:export\s*[*{]|import\s*\*\s*as\s)/u.test(statement.trim())
				)
		)
		.map(([file]) => file);

	expect(reExportOnly).toEqual([]);
});

// Plain Node (externalised SSR) throws ERR_UNKNOWN_FILE_EXTENSION on a `.css`
// import. `@c15t/ui/styles/dialog` resolves to an empty module there.
test('no built module imports a stylesheet file directly', () => {
	const offenders = Object.entries(DIST)
		.filter(([, source]) =>
			staticImports(source).some((specifier) => specifier.endsWith('.css'))
		)
		.map(([file]) => file);
	expect(offenders).toEqual([]);
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
