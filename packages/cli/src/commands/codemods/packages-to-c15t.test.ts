import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { cleanupProjects, createProject } from './__tests__/helpers';
import { runCssVariablesToV3Codemod as cssVariables } from './css-variables-to-v3';
import { runPackagesToC15tCodemod as codemod } from './packages-to-c15t';
import { runPostcssTailwind3Codemod as postcssTailwind3 } from './postcss-tailwind3';
import { createCodemodSession } from './runner';

const TODO =
	'TODO(c15t v3): c15t components add their own styles. Keep this import only with Tailwind CSS 3 or a named cascade layer, and set styles: false in the provider options.';

const ESM_TODO =
	'TODO(c15t v3): c15t ships ESM only from v3. require() loads it only on Node.js 20.19+ or 22.12+. Convert this file to import, or to an .mjs or ESM config, to support older runtimes.';

const run = async function run(
	dependencies: Record<string, string>,
	files: Record<string, string>,
	dryRun = false
) {
	const rootDir = await createProject({
		...files,
		'package.json': JSON.stringify({ dependencies, name: 'app' }),
	});
	const result = await codemod({ dryRun, projectRoot: rootDir });
	const read = (path: string) => readFile(join(rootDir, path), 'utf-8');
	return { read, result, rootDir };
};

// Each run builds a TypeScript program, which is slow on a busy machine.
describe('packages-to-c15t codemod', { timeout: 20_000 }, () => {
	afterEach(cleanupProjects);

	it('moves a React app from @c15t/react to c15t/react and drops the stylesheet import', async () => {
		const { read, result } = await run(
			{ '@c15t/integrations': '3.0.0-alpha.9', c15t: '3.0.0-alpha.9' },
			{
				'src/analytics/use-analytics.ts': `import { useConsent } from '@c15t/react';

export const useAnalytics = () => useConsent('measurement');
`,
				'src/components/site-footer.tsx': `import { ConsentDialogLink } from '@c15t/react/components/consent-dialog-link';
import { useHeadlessConsentUI } from "@c15t/react/headless";

export const SiteFooter = () => <ConsentDialogLink />;
`,
				'src/consent.tsx': `import { ConsentBanner, ConsentProvider, hosted } from '@c15t/react';
import { googleTagManager } from '@c15t/integrations/google-tag-manager';
`,
				'src/index.css': `@import "tailwindcss";
@import "@c15t/react/styles.css";

body {
	margin: 0;
}
`,
				'src/main.tsx': `import '@c15t/react/styles.css';
import './index.css';
import { Consent } from './consent';
`,
			}
		);

		expect(result.errors).toEqual([]);
		expect(result.warnings).toEqual([]);
		expect(await read('src/consent.tsx'))
			.toBe(`import { ConsentBanner, ConsentProvider, hosted } from 'c15t/react';
import { googleTagManager } from '@c15t/integrations/google-tag-manager';
`);
		expect(await read('src/analytics/use-analytics.ts')).toBe(
			`import { useConsent } from 'c15t/react';

export const useAnalytics = () => useConsent('measurement');
`
		);
		expect(await read('src/components/site-footer.tsx')).toBe(
			`import { ConsentDialogLink } from 'c15t/react/components/consent-dialog-link';
import { useHeadlessConsentUI } from "c15t/react/headless";

export const SiteFooter = () => <ConsentDialogLink />;
`
		);
		expect(await read('src/index.css')).toBe(`@import "tailwindcss";

body {
	margin: 0;
}
`);
		expect(await read('src/main.tsx')).toBe(`import './index.css';
import { Consent } from './consent';
`);
		const summaries = Object.fromEntries(
			result.changedFiles.map((file) => [
				file.filePath.replace(/^.*\/src\//u, 'src/'),
				file.summaries,
			])
		);
		expect(summaries).toMatchObject({
			'src/consent.tsx': ['@c15t/react -> c15t/react'],
			'src/index.css': ['removed @c15t/react/styles.css'],
			'src/main.tsx': ['removed @c15t/react/styles.css'],
		});
	});

	it('uses c15t/next in a Next.js app, as the Next.js guide maps @c15t/react', async () => {
		const { read, result } = await run(
			{ c15t: 'alpha', next: '^16.0.0' },
			{
				'app/globals.css': `@import '@c15t/nextjs/styles.css';
@import '@c15t/nextjs/iab/styles.css';
`,
				'app/layout.tsx': `import { ConsentManagerProvider } from '@c15t/nextjs';
import { useHeadlessConsentUI } from '@c15t/nextjs/headless';
import { useConsent } from '@c15t/react';
import { Root } from '@c15t/react/primitives/dialog';
`,
			}
		);

		expect(result.errors).toEqual([]);
		expect(await read('app/layout.tsx'))
			.toBe(`import { ConsentManagerProvider } from 'c15t/next';
import { useHeadlessConsentUI } from 'c15t/next/headless';
import { useConsent } from 'c15t/next';
import { Root } from 'c15t/react/primitives/dialog';
`);
		expect(await read('app/globals.css')).toBe('');
	});

	it('marks @c15t/nextjs/root, which c15t/next does not serve', async () => {
		const { read } = await run(
			{ c15t: '^3.0.0', next: '^16.0.0' },
			{
				'app/layout.tsx': `import { Root } from '@c15t/nextjs/root';
`,
			}
		);

		expect(await read('app/layout.tsx'))
			.toBe(`// TODO(c15t v3): @c15t/nextjs/root is not a c15t v3 entry. Import from c15t/next or one of its subpaths.
import { Root } from '@c15t/nextjs/root';
`);
	});

	it('rewrites re-exports, dynamic imports and import types', async () => {
		const { read } = await run(
			{ c15t: '^3.0.0' },
			{
				'src/consent.ts': `export { ConsentBanner } from '@c15t/react';
export * from '@c15t/react/headless';
export type Theme = import('@c15t/react/types').ReactComponentSlots;
const load = () => import('@c15t/react/consent-dialog');
`,
			}
		);

		expect(await read('src/consent.ts'))
			.toBe(`export { ConsentBanner } from 'c15t/react';
export * from 'c15t/react/headless';
export type Theme = import('c15t/react/types').ReactComponentSlots;
const load = () => import('c15t/react/consent-dialog');
`);
	});

	it('maps the v2 cookie-banner alias and marks entries v3 removed', async () => {
		const { read, result } = await run(
			{ c15t: '^3.0.0' },
			{
				'src/consent.tsx': `import { ConsentBanner } from '@c15t/react/cookie-banner';
import { YouTubeEmbed } from '@c15t/react/components/integrations';
`,
			}
		);

		expect(await read('src/consent.tsx'))
			.toBe(`import { ConsentBanner } from 'c15t/react/components/consent-banner';
// TODO(c15t v3): @c15t/react/components/integrations was removed. GoogleMap and YouTubeEmbed are gone; wrap your own embed in ConsentGate.
import { YouTubeEmbed } from '@c15t/react/components/integrations';
`);
		expect(result.changedFiles[0]?.summaries).toEqual([
			'@c15t/react/cookie-banner -> c15t/react/components/consent-banner',
			'TODO: @c15t/react/components/integrations',
		]);
	});

	it('keeps stylesheet imports Tailwind CSS 3 and cascade layers need, pointed at c15t', async () => {
		const { read } = await run(
			{ c15t: '^3.0.0', tailwindcss: '^3.4.0' },
			{
				'src/index.css': `@import '@c15t/react/styles.tw3.css';
@import '@c15t/react/iab/styles.css';

@tailwind base;
`,
			}
		);

		expect(await read('src/index.css')).toBe(`/* ${TODO} */
@import 'c15t/react/styles.css';
/* ${TODO} */
@import 'c15t/react/iab/styles.css';

@tailwind base;
`);
	});

	it('handles stylesheet imports followed by a comment', async () => {
		const { read } = await run(
			{ c15t: '^3.0.0', tailwindcss: '^4.0.0' },
			{
				'src/index.css': `@import 'tailwindcss';
@import '@c15t/react/styles.css'; /* legacy */
@import "@c15t/react/iab/styles.css" /* no semicolon */
@import url("@c15t/react/styles.css") layer(c15t); /* placed */ /* twice */
`,
			}
		);

		expect(await read('src/index.css')).toBe(`@import 'tailwindcss';
/* ${TODO} */
@import url("c15t/react/styles.css") layer(c15t); /* placed */ /* twice */
`);
	});

	it('keeps the trailing comment when it rewrites a stylesheet import', async () => {
		const { read } = await run(
			{ c15t: '^3.0.0', tailwindcss: '^3.4.0' },
			{
				'src/index.css': `@import '@c15t/react/styles.css'; /* legacy */
`,
			}
		);

		expect(await read('src/index.css')).toBe(`/* ${TODO} */
@import 'c15t/react/styles.css'; /* legacy */
`);
	});

	it('handles // comments after stylesheet imports in Sass and Less', async () => {
		const { read } = await run(
			{ c15t: '^3.0.0', tailwindcss: '^4.0.0' },
			{
				'src/index.css': `@import '@c15t/react/styles.css'; // not a CSS comment
`,
				'src/legacy.less': `@import '@c15t/react/styles.css'; // legacy
`,
				'src/main.scss': `@import '@c15t/react/styles.css'; // legacy
@import "@c15t/react/iab/styles.css"; /* block */ // and line
`,
				'src/theme.sass': `@import '@c15t/react/styles.css' // indented syntax
`,
			}
		);

		expect(await read('src/main.scss')).toBe('');
		expect(await read('src/theme.sass')).toBe('');
		expect(await read('src/legacy.less')).toBe('');
		// Plain CSS has no // comments, so the line is left alone.
		expect(await read('src/index.css')).toBe(
			`@import '@c15t/react/styles.css'; // not a CSS comment
`
		);
	});

	it('keeps a // comment when it rewrites a Sass stylesheet import', async () => {
		const { read } = await run(
			{ c15t: '^3.0.0', tailwindcss: '^3.4.0' },
			{
				'src/main.scss': `@import '@c15t/react/styles.css'; // legacy
`,
				'src/theme.sass': `@import '@c15t/react/styles.css' // indented syntax
`,
			}
		);

		expect(await read('src/main.scss')).toBe(`/* ${TODO} */
@import 'c15t/react/styles.css'; // legacy
`);
		expect(await read('src/theme.sass')).toBe(`/* ${TODO} */
@import 'c15t/react/styles.css' // indented syntax
`);
	});

	it('removes every c15t target from a comma-separated Sass import', async () => {
		const css = `@import url(a.css) screen, print;
@import url("@c15t/react/styles.css") screen, print;
`;
		const { read } = await run(
			{ c15t: '^3.0.0', tailwindcss: '^4.0.0' },
			{
				'src/first.scss': `@import '@c15t/react/styles.css', "./theme"; // legacy
body {}
`,
				'src/index.css': css,
				'src/main.scss': `@import './theme', '@c15t/react/styles.css';
@import
	'@c15t/react/styles.css',
	'./reset',
	"@c15t/react/iab/styles.css";
@import '@c15t/react/styles.css', url(@c15t/react/iab/styles.css);
body {}
`,
				'src/theme.sass': `@import './base', '@c15t/react/styles.css', 'url(x, y)'
@import "@c15t/react/styles.css", '@c15t/nextjs/styles.css'
body
	color: red
`,
			}
		);

		expect(await read('src/main.scss')).toBe(`@import './theme';
@import
	'./reset';
body {}
`);
		expect(await read('src/first.scss')).toBe(`@import "./theme"; // legacy
body {}
`);
		expect(await read('src/theme.sass')).toBe(`@import './base', 'url(x, y)'
body
	color: red
`);
		// In CSS, the comma separates media queries, not targets.
		expect(await read('src/index.css')).toBe(`@import url(a.css) screen, print;
/* ${TODO} */
@import url("c15t/react/styles.css") screen, print;
`);
	});

	it('rewrites a c15t target in place in a comma-separated Sass import', async () => {
		const { read } = await run(
			{ c15t: '^3.0.0', tailwindcss: '^3.4.0' },
			{
				'src/main.scss': `@import './theme', '@c15t/react/styles.tw3.css';
`,
				'src/theme.sass': `@import './base', "@c15t/react/iab/styles.tw3.css", '@c15t/react/styles.css'
`,
			}
		);

		expect(await read('src/main.scss')).toBe(`/* ${TODO} */
@import './theme', 'c15t/react/styles.css';
`);
		expect(await read('src/theme.sass')).toBe(`/* ${TODO} */
@import './base', "c15t/react/iab/styles.css", 'c15t/react/styles.css'
`);
	});

	it('migrates a Sass import list that ends in a media query', async () => {
		const { read } = await run(
			{ c15t: '^3.0.0', tailwindcss: '^4.0.0' },
			{
				'src/first.scss': `@import '@c15t/react/styles.css', './theme' screen;
`,
				'src/last.scss': `@import './theme', '@c15t/react/styles.css' screen;
`,
				'src/theme.sass': `@import '@c15t/react/styles.css', "@c15t/react/iab/styles.css" print
`,
			}
		);

		// The media query applies to the last target alone, so it stays there.
		expect(await read('src/last.scss')).toBe(`/* ${TODO} */
@import './theme', 'c15t/react/styles.css' screen;
`);
		expect(await read('src/first.scss')).toBe(`@import './theme' screen;
`);
		expect(await read('src/theme.sass')).toBe(`/* ${TODO} */
@import "c15t/react/iab/styles.css" print
`);
	});

	it('keeps comments in front of removed Sass import targets', async () => {
		const { read } = await run(
			{ c15t: '^3.0.0', tailwindcss: '^4.0.0' },
			{
				'src/first.scss': `@import '@c15t/react/styles.css', /* theme override */ './theme';
`,
				'src/lines.scss': `@import
	'@c15t/react/styles.css',
	// theme override
	'./theme';
`,
				'src/middle.scss': `@import './base', /* theme override */ '@c15t/react/styles.css', './theme';
`,
			}
		);

		expect(await read('src/first.scss')).toBe(
			`@import /* theme override */ './theme';
`
		);
		expect(await read('src/lines.scss')).toBe(`@import
	// theme override
	'./theme';
`);
		expect(await read('src/middle.scss')).toBe(
			`@import './base', /* theme override */ './theme';
`
		);
	});

	it('keeps comments in front of a removed final Sass import target', async () => {
		const { read } = await run(
			{ c15t: '^3.0.0', tailwindcss: '^4.0.0' },
			{
				'src/block.scss': `@import './theme', /* application note */ '@c15t/react/styles.css';
`,
				'src/line.scss': `@import
	'./theme',
	// application note
	'@c15t/react/styles.css',
	/* iab */ '@c15t/react/iab/styles.css';
`,
			}
		);

		expect(await read('src/block.scss')).toBe(
			`@import './theme' /* application note */;
`
		);
		// A line comment becomes a block comment, so the `;` stays on its line.
		expect(await read('src/line.scss')).toBe(`@import
	'./theme' /* application note */ /* iab */;
`);
	});

	it('migrates Sass pkg: stylesheet URLs', async () => {
		const scss = `@use 'pkg:@c15t/react/styles.css';
@forward 'pkg:@c15t/nextjs/styles.css';
@import 'pkg:@c15t/react/iab/styles.css';
`;
		const removed = await run(
			{ c15t: '^3.0.0', tailwindcss: '^4.0.0' },
			{ 'src/main.scss': scss }
		);
		const kept = await run(
			{ c15t: '^3.0.0', tailwindcss: '^3.4.0' },
			{ 'src/main.scss': scss }
		);

		expect(await removed.read('src/main.scss')).toBe('');
		expect(await kept.read('src/main.scss')).toBe(`/* ${TODO} */
@use 'pkg:c15t/react/styles.css';
/* ${TODO} */
@forward 'pkg:c15t/next/styles.css';
/* ${TODO} */
@import 'pkg:c15t/react/iab/styles.css';
`);
	});

	it('migrates Sass @use and @forward of c15t stylesheets', async () => {
		const css = `@use '@c15t/react/styles.css';
@forward '@c15t/react/styles.css';
`;
		const { read } = await run(
			{ c15t: '^3.0.0', tailwindcss: '^4.0.0' },
			{
				'src/index.css': css,
				'src/legacy.less': css,
				'src/main.scss': `@use 'sass:math';
@use '@c15t/react/styles.css';
@forward "@c15t/nextjs/styles.css"; // legacy
@use '@c15t/react/iab/styles.css' as c15t;
@use '@c15t/react/styles.css' with ($radius: 4px);
@forward '@c15t/nextjs/styles.css' show $radius;
@forward '@c15t/react/styles.css' hide $radius;
body {}
`,
				'src/theme.sass': `@use '@c15t/react/styles.css'
@forward '@c15t/nextjs/styles.css' as c15t-*
body
	color: red
`,
			}
		);

		expect(await read('src/main.scss')).toBe(`@use 'sass:math';
/* ${TODO} */
@use 'c15t/react/iab/styles.css' as c15t;
/* ${TODO} */
@use 'c15t/react/styles.css' with ($radius: 4px);
/* ${TODO} */
@forward 'c15t/next/styles.css' show $radius;
/* ${TODO} */
@forward 'c15t/react/styles.css' hide $radius;
body {}
`);
		expect(await read('src/theme.sass')).toBe(`/* ${TODO} */
@forward 'c15t/next/styles.css' as c15t-*
body
	color: red
`);
		// CSS and Less have no @use or @forward.
		expect(await read('src/index.css')).toBe(css);
		expect(await read('src/legacy.less')).toBe(css);
	});

	it('rewrites a Sass @use of a c15t stylesheet under Tailwind CSS 3', async () => {
		const { read } = await run(
			{ c15t: '^3.0.0', tailwindcss: '^3.4.0' },
			{
				'src/main.scss': `@use '@c15t/react/styles.tw3.css';
`,
			}
		);

		expect(await read('src/main.scss')).toBe(`/* ${TODO} */
@use 'c15t/react/styles.css';
`);
	});

	it('keeps a stylesheet imported into a named layer', async () => {
		const { read } = await run(
			{ c15t: '^3.0.0', tailwindcss: '^4.0.0' },
			{
				'src/index.css': `@layer reset, c15t, app;
@import url("@c15t/react/styles.css") layer(c15t);
`,
				'src/main.ts': `import '@c15t/react/styles.tw3.css';
`,
			}
		);

		expect(await read('src/index.css')).toBe(`@layer reset, c15t, app;
/* ${TODO} */
@import url("c15t/react/styles.css") layer(c15t);
`);
		expect(await read('src/main.ts')).toBe(`// ${TODO}
import 'c15t/react/styles.css';
`);
	});

	it('reads stylesheet imports that span lines', async () => {
		const { read } = await run(
			{ c15t: '^3.0.0', tailwindcss: '^4.0.0' },
			{
				'src/index.css': `@import url('@c15t/react/styles.css')
	layer(c15t);
body {}
`,
				'src/main.scss': `@import
	'@c15t/react/styles.css'; // legacy
body {}
`,
			}
		);

		expect(await read('src/index.css')).toBe(`/* ${TODO} */
@import url('c15t/react/styles.css')
	layer(c15t);
body {}
`);
		expect(await read('src/main.scss')).toBe('body {}\n');
	});

	it('handles a stylesheet import that shares its line with the next rule', async () => {
		const { read } = await run(
			{ c15t: '^3.0.0', tailwindcss: '^4.0.0' },
			{
				'src/index.css': `@import '@c15t/react/styles.css'; @import './theme.css';
@import './reset.css'; @import "@c15t/react/iab/styles.css"; /* old */ @import './base.css';
@import url('@c15t/react/styles.css') layer(c15t); @import './app.css';
@import '@c15t/react/styles.css' .a { color: red }
`,
			}
		);

		expect(await read('src/index.css')).toBe(`@import './theme.css';
@import './reset.css'; @import './base.css';
/* ${TODO} */
@import url('c15t/react/styles.css') layer(c15t); @import './app.css';
@import '@c15t/react/styles.css' .a { color: red }
`);
	});

	it('reads Less import options', async () => {
		const { read } = await run(
			{ c15t: '^3.0.0', tailwindcss: '^4.0.0' },
			{
				'src/theme.less': `// @import (css) '@c15t/react/styles.css';
@import (css) '@c15t/react/styles.css';
@import (reference, optional) url("@c15t/react/iab/styles.css"); // legacy
@import (css) '@c15t/react/styles.css' screen;
`,
			}
		);

		expect(await read('src/theme.less'))
			.toBe(`// @import (css) '@c15t/react/styles.css';
/* ${TODO} */
@import (css) 'c15t/react/styles.css' screen;
`);
	});

	it('rewrites require() calls with a string literal', async () => {
		const { read, result } = await run(
			{ c15t: '^3.0.0' },
			{
				'src/consent.cjs': `const { ConsentManagerProvider } = require('@c15t/react');
const headless = require("@c15t/react/headless");
const { c15tMiddleware } = require('@c15t/nextjs/middleware');
const legacy = require('@c15t/react/legacy');
const dynamic = require(\`@c15t/react/\${name}\`);
const fixed = require(\`@c15t/react\`);
require('@c15t/react/styles.css');
`,
			}
		);

		expect(result.errors).toEqual([]);
		expect(await read('src/consent.cjs')).toBe(`// ${ESM_TODO}
const { ConsentManagerProvider } = require('c15t/react');
// ${ESM_TODO}
const headless = require("c15t/react/headless");
// ${ESM_TODO}
const { c15tMiddleware } = require('c15t/next/middleware');
// TODO(c15t v3): @c15t/react/legacy is not a c15t v3 entry. Import from c15t/react or one of its subpaths.
const legacy = require('@c15t/react/legacy');
const dynamic = require(\`@c15t/react/\${name}\`);
const fixed = require(\`@c15t/react\`);
`);
	});

	it('rewrites only require() calls that load Node modules', async () => {
		const shadowed = `function lookup(require) {
	return require('@c15t/react');
}
`;
		const local = `const require = (name) => name;
require('@c15t/react');
`;
		const { read, result } = await run(
			{ c15t: '^3.0.0' },
			{
				'src/created.mjs': `import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
require('@c15t/react');
`,
				'src/global.cjs': `require('@c15t/react');
`,
				'src/local.cjs': local,
				'src/shadowed.cjs': shadowed,
			}
		);

		expect(await read('src/shadowed.cjs')).toBe(shadowed);
		expect(await read('src/local.cjs')).toBe(local);
		expect(await read('src/created.mjs'))
			.toBe(`import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
// ${ESM_TODO}
require('c15t/react');
`);
		expect(await read('src/global.cjs')).toBe(`// ${ESM_TODO}
require('c15t/react');
`);
		expect(result.warnings?.map(({ filePath }) => filePath).sort()).toEqual([
			expect.stringMatching(/src\/created\.mjs$/u),
			expect.stringMatching(/src\/global\.cjs$/u),
		]);
	});

	it('rewrites TypeScript import-equals declarations', async () => {
		const { read, result } = await run(
			{ c15t: '^3.0.0' },
			{
				'src/consent.ts': `import C15t = require('@c15t/react');
import Headless = require("@c15t/react/headless");
import Legacy = require('@c15t/react/legacy');
`,
			}
		);

		expect(await read('src/consent.ts')).toBe(`// ${ESM_TODO}
import C15t = require('c15t/react');
// ${ESM_TODO}
import Headless = require("c15t/react/headless");
// TODO(c15t v3): @c15t/react/legacy is not a c15t v3 entry. Import from c15t/react or one of its subpaths.
import Legacy = require('@c15t/react/legacy');
`);
		expect(result.warnings).toEqual([
			{
				filePath: expect.stringMatching(/src\/consent\.ts$/u),
				message:
					'2 require() calls name c15t, which ships ESM only from v3. require() loads it only on Node.js 20.19+ or 22.12+. Convert the file to import, or to an .mjs or ESM config, to support older runtimes.',
			},
		]);
	});

	it('flags each file whose require() calls now name c15t', async () => {
		const { result } = await run(
			{ c15t: '^3.0.0' },
			{
				'src/a.cjs': `const { useConsent } = require('@c15t/react');
`,
				'src/b.cjs': `const c15t = require('@c15t/react');
const headless = require('@c15t/react/headless');
`,
				'src/c.mjs': `import { useConsent } from '@c15t/react';
`,
			}
		);

		expect(result.warnings).toEqual([
			{
				filePath: expect.stringMatching(/src\/a\.cjs$/u),
				message:
					'1 require() call names c15t, which ships ESM only from v3. require() loads it only on Node.js 20.19+ or 22.12+. Convert the file to import, or to an .mjs or ESM config, to support older runtimes.',
			},
			{
				filePath: expect.stringMatching(/src\/b\.cjs$/u),
				message:
					'2 require() calls name c15t, which ships ESM only from v3. require() loads it only on Node.js 20.19+ or 22.12+. Convert the file to import, or to an .mjs or ESM config, to support older runtimes.',
			},
		]);
	});

	it('adds no ESM TODO to require.resolve(), import() or mocks', async () => {
		const { read, result } = await run(
			{ c15t: '^3.0.0' },
			{
				'src/consent.test.ts': `const path = require.resolve('@c15t/react');
const lazy = await import('@c15t/react/headless');
vi.mock('@c15t/react');
const actual = jest.requireActual('@c15t/react');
`,
			}
		);

		expect(await read('src/consent.test.ts'))
			.toBe(`const path = require.resolve('c15t/react');
const lazy = await import('c15t/react/headless');
vi.mock('c15t/react');
const actual = jest.requireActual('c15t/react');
`);
		expect(result.warnings).toEqual([]);
	});

	it('points vi.mock() and jest.mock() calls at the new entries', async () => {
		const { read } = await run(
			{ c15t: '^3.0.0' },
			{
				'src/consent.test.ts': `import { useConsent } from '@c15t/react';
vi.mock('@c15t/react', () => ({ useConsent: vi.fn() }));
jest.mock("@c15t/nextjs/headless");
const actual = await vi.importActual('@c15t/react/legacy');
vi.mock('@c15t/react/styles.css', () => ({}));
vi.mock(\`@c15t/react\`);
`,
			}
		);

		expect(await read('src/consent.test.ts'))
			.toBe(`import { useConsent } from 'c15t/react';
vi.mock('c15t/react', () => ({ useConsent: vi.fn() }));
jest.mock("c15t/next/headless");
// TODO(c15t v3): @c15t/react/legacy is not a c15t v3 entry. Import from c15t/react or one of its subpaths.
const actual = await vi.importActual('@c15t/react/legacy');
vi.mock('c15t/react/styles.css', () => ({}));
vi.mock(\`@c15t/react\`);
`);
	});

	it.each([
		'jest.createMockFromModule',
		'jest.deepUnmock',
		'jest.doMock',
		'jest.dontMock',
		'jest.mock',
		'jest.requireActual',
		'jest.requireMock',
		'jest.setMock',
		'jest.unmock',
		'jest.unstable_mockModule',
		'jest.unstable_unmockModule',
		'vi.doMock',
		'vi.doUnmock',
		'vi.importActual',
		'vi.importMock',
		'vi.mock',
		'vi.unmock',
	])('points %s() at the new entry', async (helper) => {
		const { read } = await run(
			{ c15t: '^3.0.0' },
			{ 'src/consent.test.ts': `${helper}('@c15t/react');\n` }
		);

		expect(await read('src/consent.test.ts')).toBe(
			`${helper}('c15t/react');\n`
		);
	});

	it('leaves module helpers on local bindings alone', async () => {
		const shadowed = `function lookup(require) {
	return require.resolve('@c15t/react');
}
`;
		const local = `const vi = { mock: (name) => name };
vi.mock('@c15t/react');
`;
		const { read } = await run(
			{ c15t: '^3.0.0' },
			{
				'src/global.test.ts': `import { jest } from '@jest/globals';
import { vi } from 'vitest';
const path = require.resolve('@c15t/react');
vi.mock('@c15t/react');
jest.mock('@c15t/react');
`,
				'src/local.ts': local,
				'src/shadowed.cjs': shadowed,
			}
		);

		expect(await read('src/shadowed.cjs')).toBe(shadowed);
		expect(await read('src/local.ts')).toBe(local);
		expect(await read('src/global.test.ts'))
			.toBe(`import { jest } from '@jest/globals';
import { vi } from 'vitest';
const path = require.resolve('c15t/react');
vi.mock('c15t/react');
jest.mock('c15t/react');
`);
	});

	it('resolves aliased and namespaced test-runner helpers', async () => {
		const local = `const test = { mock: (name) => name };
test.mock('@c15t/react');
`;
		const { read } = await run(
			{ c15t: '^3.0.0' },
			{
				'src/aliased.test.ts': `import { jest as j } from '@jest/globals';
import { vi as test } from 'vitest';
test.mock('@c15t/react');
j.mock('@c15t/react');
`,
				'src/local.ts': local,
				'src/namespace.test.ts': `import * as V from 'vitest';
V.vi.mock('@c15t/react');
`,
			}
		);

		expect(await read('src/aliased.test.ts'))
			.toBe(`import { jest as j } from '@jest/globals';
import { vi as test } from 'vitest';
test.mock('c15t/react');
j.mock('c15t/react');
`);
		expect(await read('src/namespace.test.ts'))
			.toBe(`import * as V from 'vitest';
V.vi.mock('c15t/react');
`);
		expect(await read('src/local.ts')).toBe(local);
	});

	it('points mocks of a removed stylesheet import at c15t', async () => {
		const { read, result } = await run(
			{ c15t: '^3.0.0', tailwindcss: '^4.0.0' },
			{
				'src/consent.test.ts': `import '@c15t/react/styles.css';
jest.mock('@c15t/react/styles.css', () => ({}));
jest.mock("@c15t/nextjs/iab/styles.tw3.css", () => ({}));
const css = await vi.importActual('@c15t/react/iab/styles.css');
const actual = jest.requireActual('@c15t/react/styles.tw3.css');
const path = require.resolve('@c15t/nextjs/styles.css');
`,
			}
		);

		expect(await read('src/consent.test.ts'))
			.toBe(`jest.mock('c15t/react/styles.css', () => ({}));
jest.mock("c15t/next/iab/styles.css", () => ({}));
const css = await vi.importActual('c15t/react/iab/styles.css');
const actual = jest.requireActual('c15t/react/styles.css');
const path = require.resolve('c15t/next/styles.css');
`);
		expect(result.warnings).toEqual([]);
	});

	it('points a mock of a kept stylesheet import where the import goes', async () => {
		const { read } = await run(
			{ c15t: '^3.0.0', next: '^15.0.0', tailwindcss: '^3.4.0' },
			{
				'src/layout.test.tsx': `import '@c15t/nextjs/styles.css';
vi.mock('@c15t/nextjs/styles.css', () => ({}));
jest.mock("@c15t/react/iab/styles.tw3.css");
`,
			}
		);

		expect(await read('src/layout.test.tsx')).toBe(`// ${TODO}
import 'c15t/next/styles.css';
vi.mock('c15t/next/styles.css', () => ({}));
jest.mock("c15t/react/iab/styles.css");
`);
	});

	it('puts the TODO for a JSDoc import type above the comment', async () => {
		const { read } = await run(
			{ c15t: '^3.0.0' },
			{
				'src/options.js': `/** @type {import('@c15t/react/legacy').Options} */
const options = {};
/** @param {import('@c15t/react').Theme} theme */
export function apply(theme) {}
`,
			}
		);

		expect(await read('src/options.js'))
			.toBe(`// TODO(c15t v3): @c15t/react/legacy is not a c15t v3 entry. Import from c15t/react or one of its subpaths.
/** @type {import('@c15t/react/legacy').Options} */
const options = {};
/** @param {import('c15t/react').Theme} theme */
export function apply(theme) {}
`);
	});

	it('points object-form and required PostCSS plugins at c15t/postcss-tailwind3', async () => {
		const { read, result } = await run(
			{ c15t: '^3.0.0', next: '^15.0.0', tailwindcss: '^3.4.17' },
			{
				'apps/docs/postcss.config.cjs': `module.exports = {
	plugins: [require("@c15t/react/postcss-tailwind3"), require('tailwindcss')],
};
`,
				'postcss.config.mjs': `export default {
	plugins: {
		'@c15t/nextjs/postcss-tailwind3': {},
		tailwindcss: {},
		'@c15t/nextjs': {},
	},
};
`,
			}
		);

		expect(result.errors).toEqual([]);
		expect(await read('postcss.config.mjs')).toBe(`export default {
	plugins: {
		'c15t/postcss-tailwind3': {},
		tailwindcss: {},
		'@c15t/nextjs': {},
	},
};
`);
		expect(await read('apps/docs/postcss.config.cjs')).toBe(`module.exports = {
	plugins: [/* ${ESM_TODO} */ require("c15t/postcss-tailwind3"), require('tailwindcss')],
};
`);
		expect(result.warnings).toEqual([
			{
				filePath: expect.stringMatching(/apps\/docs\/postcss\.config\.cjs$/u),
				message:
					'1 require() call names c15t, which ships ESM only from v3. require() loads it only on Node.js 20.19+ or 22.12+. Convert the file to import, or to an .mjs or ESM config, to support older runtimes.',
			},
		]);
	});

	it('rewrites PostCSS plugin keys only inside a plugins object', async () => {
		const compatibility = `export const compatibility = {
	'@c15t/react/postcss-tailwind3': false,
};
`;
		const { read, result } = await run(
			{ c15t: '^3.0.0', tailwindcss: '^3.4.17' },
			{
				'postcss.config.cjs': `module.exports = {
	plugins: { '@c15t/nextjs/postcss-tailwind3': {} },
};
`,
				'postcss.config.ts': `import { defineConfig } from 'postcss-load-config';

export default defineConfig({
	plugins: ({
		'@c15t/react/postcss-tailwind3': {},
	} satisfies Record<string, object>),
	options: { '@c15t/react/postcss-tailwind3': {} },
});
`,
				'src/compatibility.ts': compatibility,
			}
		);

		expect(result.errors).toEqual([]);
		expect(await read('src/compatibility.ts')).toBe(compatibility);
		expect(await read('postcss.config.ts'))
			.toBe(`import { defineConfig } from 'postcss-load-config';

export default defineConfig({
	plugins: ({
		'c15t/postcss-tailwind3': {},
	} satisfies Record<string, object>),
	options: { '@c15t/react/postcss-tailwind3': {} },
});
`);
		expect(await read('postcss.config.cjs')).toBe(`module.exports = {
	plugins: { 'c15t/postcss-tailwind3': {} },
};
`);
	});

	it('rewrites computed PostCSS plugin keys only inside a plugins object', async () => {
		const { read, result } = await run(
			{ c15t: '^3.0.0', tailwindcss: '^3.4.17' },
			{
				'postcss.config.mjs': `export default {
	plugins: {
		['@c15t/react/postcss-tailwind3']: {},
		[\`@c15t/nextjs/postcss-tailwind3\`]: {},
		tailwindcss: {},
	},
	options: { [\`@c15t/react/postcss-tailwind3\`]: {} },
};
`,
			}
		);

		expect(result.errors).toEqual([]);
		expect(await read('postcss.config.mjs')).toBe(`export default {
	plugins: {
		['c15t/postcss-tailwind3']: {},
		[\`c15t/postcss-tailwind3\`]: {},
		tailwindcss: {},
	},
	options: { [\`@c15t/react/postcss-tailwind3\`]: {} },
};
`);
	});

	it('adds one ESM TODO to a required PostCSS plugin across codemod runs', async () => {
		const config = `module.exports = {
	plugins: [
		require('@c15t/react/postcss-tailwind3'),
		require('tailwindcss'),
	],
};
`;
		const { read, rootDir } = await run(
			{ c15t: '^3.0.0', tailwindcss: '^3.4.17' },
			{ 'postcss.config.cjs': config }
		);
		const tailwind3 = await postcssTailwind3({
			dryRun: false,
			projectRoot: rootDir,
		});
		await codemod({ dryRun: false, projectRoot: rootDir });

		expect(tailwind3.changedFiles).toEqual([]);
		expect(await read('postcss.config.cjs')).toBe(`module.exports = {
	plugins: [
		// ${ESM_TODO}
		require('c15t/postcss-tailwind3'),
		require('tailwindcss'),
	],
};
`);
	});

	it('passes dry-run stylesheet edits to the next codemod in a session', async () => {
		const stylesheet = `@import "@c15t/react/styles.css";
.banner {
	--consent-widget-max-width: 40rem;
}
`;
		const { read, rootDir } = await run(
			{ c15t: '^3.0.0' },
			{ 'src/index.css': stylesheet },
			true
		);
		const session = await createCodemodSession(rootDir);
		const options = { dryRun: true, projectRoot: rootDir, session };
		const packages = await codemod(options);
		const variables = await cssVariables(options);
		const path = join(rootDir, 'src/index.css');
		const first = packages.changedFiles.find((file) => file.filePath === path);
		const second = variables.changedFiles.find(
			(file) => file.filePath === path
		);

		expect(first?.before).toBe(stylesheet);
		expect(second?.before).toBe(first?.after);
		expect(second?.after).toBe(`.banner {
	--consent-manager-max-width: 40rem;
}
`);
		expect(await read('src/index.css')).toBe(stylesheet);
	});

	it('keeps a disabled computed PostCSS plugin key disabled', async () => {
		const { read, rootDir } = await run(
			{ c15t: '^3.0.0', tailwindcss: '^3.4.17' },
			{
				'postcss.config.mjs': `export default {
	plugins: {
		['@c15t/react/postcss-tailwind3']: false,
		tailwindcss: {},
	},
};
`,
			}
		);
		const tailwind3 = await postcssTailwind3({
			dryRun: false,
			projectRoot: rootDir,
		});

		expect(tailwind3.changedFiles).toEqual([]);
		expect(await read('postcss.config.mjs')).toBe(`export default {
	plugins: {
		['c15t/postcss-tailwind3']: false,
		tailwindcss: {},
	},
};
`);
	});

	it.each(['workspace:*', 'catalog:', 'latest', '*', 'file:../tailwindcss'])(
		'keeps stylesheet imports and warns when Tailwind CSS %s does not resolve',
		async (specifier) => {
			const { read, result } = await run(
				{ c15t: '^3.0.0', tailwindcss: specifier },
				{
					'src/index.css': `@import "@c15t/react/styles.css";
`,
					'src/main.ts': `import '@c15t/react/styles.css';
`,
				}
			);

			expect(await read('src/index.css')).toBe(`/* ${TODO} */
@import "c15t/react/styles.css";
`);
			expect(await read('src/main.ts')).toBe(`// ${TODO}
import 'c15t/react/styles.css';
`);
			expect(result.warnings).toEqual([
				expect.objectContaining({
					message: expect.stringContaining(
						`Could not tell the Tailwind CSS version from '${specifier}'`
					),
				}),
			]);
		}
	);

	it.each(['>=2 <4', '^3 || ^4', '2 - 4'])(
		'reads the installed Tailwind CSS for %s, which spans several majors',
		async (specifier) => {
			const { read, result } = await run(
				{ c15t: '^3.0.0', tailwindcss: specifier },
				{
					'node_modules/tailwindcss/package.json': JSON.stringify({
						version: '3.4.17',
					}),
					'src/main.ts': `import '@c15t/react/styles.css';
`,
				}
			);

			expect(await read('src/main.ts')).toBe(`// ${TODO}
import 'c15t/react/styles.css';
`);
			expect(result.warnings).toEqual([]);
		}
	);

	it('keeps stylesheet imports and warns for a multi-major range with nothing installed', async () => {
		const { read, result } = await run(
			{ c15t: '^3.0.0', tailwindcss: '^3 || ^4' },
			{
				'src/main.ts': `import '@c15t/react/styles.css';
`,
			}
		);

		expect(await read('src/main.ts')).toBe(`// ${TODO}
import 'c15t/react/styles.css';
`);
		expect(result.warnings).toEqual([
			expect.objectContaining({
				message: expect.stringContaining(
					"Could not tell the Tailwind CSS version from '^3 || ^4'"
				),
			}),
		]);
	});

	it.each(['~3', '3.x', '>=3.0.0 <4', 'workspace:^3.4.0'])(
		'reads %s as Tailwind CSS 3 without checking the installed version',
		async (specifier) => {
			const { read, result } = await run(
				{ c15t: '^3.0.0', tailwindcss: specifier },
				{
					'node_modules/tailwindcss/package.json': JSON.stringify({
						version: '4.1.0',
					}),
					'src/main.ts': `import '@c15t/react/styles.css';
`,
				}
			);

			expect(await read('src/main.ts')).toBe(`// ${TODO}
import 'c15t/react/styles.css';
`);
			expect(result.warnings).toEqual([]);
		}
	);

	it('removes stylesheet imports when the installed Tailwind CSS is 4', async () => {
		const { read, result } = await run(
			{ c15t: '^3.0.0', tailwindcss: 'catalog:' },
			{
				'node_modules/tailwindcss/package.json': JSON.stringify({
					version: '4.1.0',
				}),
				'src/main.ts': `import '@c15t/react/styles.css';
`,
			}
		);

		expect(await read('src/main.ts')).toBe('');
		expect(result.warnings).toEqual([]);
	});

	it('reads the installed Tailwind CSS 3 for a named catalog', async () => {
		const { read, result } = await run(
			{ c15t: '^3.0.0', tailwindcss: 'catalog:frontend2026' },
			{
				'node_modules/tailwindcss/package.json': JSON.stringify({
					version: '3.4.17',
				}),
				'src/main.ts': `import '@c15t/react/styles.css';
`,
			}
		);

		expect(await read('src/main.ts')).toBe(`// ${TODO}
import 'c15t/react/styles.css';
`);
		expect(result.warnings).toEqual([]);
	});

	it('keeps stylesheet imports and warns for a named catalog with nothing installed', async () => {
		const { read, result } = await run(
			{ c15t: '^3.0.0', tailwindcss: 'catalog:frontend2026' },
			{
				'src/main.ts': `import '@c15t/react/styles.css';
`,
			}
		);

		expect(await read('src/main.ts')).toBe(`// ${TODO}
import 'c15t/react/styles.css';
`);
		expect(result.warnings).toEqual([
			expect.objectContaining({
				message: expect.stringContaining(
					"Could not tell the Tailwind CSS version from 'catalog:frontend2026'"
				),
			}),
		]);
	});

	it.each([
		'link:../tailwindcss-3',
		'file:../tailwindcss-3.4.17.tgz',
		'git+https://github.com/tailwindlabs/tailwindcss.git#v3.4.17',
		'github:tailwindlabs/tailwindcss#v3',
		'next',
	])(
		'reads the installed Tailwind CSS for %s, which is not a semver range',
		async (specifier) => {
			const { read, result } = await run(
				{ c15t: '^3.0.0', tailwindcss: specifier },
				{
					'node_modules/tailwindcss/package.json': JSON.stringify({
						version: '4.1.0',
					}),
					'src/main.ts': `import '@c15t/react/styles.css';
`,
				}
			);

			expect(await read('src/main.ts')).toBe('');
			expect(result.warnings).toEqual([]);
		}
	);

	it('reads Tailwind CSS 3 from peer and optional dependencies', async () => {
		const files = {
			'src/consent.tsx': `import '@c15t/react/styles.css';
`,
		};
		const peer = await createProject({
			...files,
			'package.json': JSON.stringify({
				dependencies: { c15t: '^3.0.0' },
				name: 'shared-ui',
				peerDependencies: { tailwindcss: '^3.4.0' },
			}),
		});
		const optional = await createProject({
			...files,
			'package.json': JSON.stringify({
				dependencies: { c15t: '^3.0.0' },
				name: 'shared-ui',
				optionalDependencies: { tailwindcss: '^3.4.0' },
			}),
		});
		await codemod({ dryRun: false, projectRoot: peer });
		await codemod({ dryRun: false, projectRoot: optional });

		const kept = `// ${TODO}
import 'c15t/react/styles.css';
`;
		expect(await readFile(join(peer, 'src/consent.tsx'), 'utf-8')).toBe(kept);
		expect(await readFile(join(optional, 'src/consent.tsx'), 'utf-8')).toBe(
			kept
		);
	});

	it('removes several stylesheet imports that share a line', async () => {
		const { read, result } = await run(
			{ c15t: '^3.0.0', tailwindcss: '^4.0.0' },
			{
				'src/main.ts': `import '@c15t/react/styles.css'; import '@c15t/react/iab/styles.css';
import './app.css'; import '@c15t/react/styles.css'; import './theme.css'; import '@c15t/nextjs/styles.css';
require('@c15t/react/styles.css'); require('@c15t/react/iab/styles.css');
import { ConsentBanner } from '@c15t/react';
`,
			}
		);

		expect(result.errors).toEqual([]);
		expect(await read('src/main.ts'))
			.toBe(`import './app.css'; import './theme.css';
import { ConsentBanner } from 'c15t/react';
`);
	});

	it('keeps stylesheet imports when a peer range allows Tailwind CSS 3 but devDependencies use 4', async () => {
		const files = {
			'node_modules/tailwindcss/package.json': JSON.stringify({
				version: '4.1.0',
			}),
			'src/consent.tsx': `import '@c15t/react/styles.css';
`,
		};
		const library = await createProject({
			...files,
			'package.json': JSON.stringify({
				dependencies: { c15t: '^3.0.0' },
				devDependencies: { tailwindcss: '^4.1.0' },
				name: 'shared-ui',
				peerDependencies: { tailwindcss: '^3 || ^4' },
			}),
		});
		const app = await createProject({
			...files,
			'package.json': JSON.stringify({
				dependencies: { c15t: '^3.0.0', tailwindcss: '^4.1.0' },
				name: 'app',
				peerDependencies: { tailwindcss: '^4.0.0' },
			}),
		});
		const result = await codemod({ dryRun: false, projectRoot: library });
		await codemod({ dryRun: false, projectRoot: app });

		expect(await readFile(join(library, 'src/consent.tsx'), 'utf-8'))
			.toBe(`// ${TODO}
import 'c15t/react/styles.css';
`);
		expect(result.warnings).toEqual([]);
		expect(await readFile(join(app, 'src/consent.tsx'), 'utf-8')).toBe('');
	});

	it('keeps scoped imports when the app installs @c15t/react v3 without c15t, but drops the stylesheet', async () => {
		const source = `import { ConsentProvider } from '@c15t/react';
`;
		const { read, result } = await run(
			{ '@c15t/react': '3.0.0-alpha.9' },
			{
				'src/consent.tsx': source,
				'src/index.css': `@import "@c15t/react/styles.css";
`,
			}
		);

		expect(await read('src/consent.tsx')).toBe(source);
		expect(await read('src/index.css')).toBe('');
		expect(result.warnings).toEqual([
			expect.objectContaining({
				message: expect.stringContaining(
					'package.json lists @c15t/react without c15t 3'
				),
			}),
		]);
	});

	it('warns about @c15t/react v2 without c15t 3 when only a stylesheet imports it', async () => {
		const { result } = await run(
			{ '@c15t/react': '^2.3.0' },
			{
				'src/index.css': `@import "@c15t/react/styles.css";
`,
			}
		);

		expect(result.errors).toEqual([]);
		expect(result.warnings).toEqual([
			{
				filePath: expect.stringMatching(/package\.json$/u),
				message:
					'package.json lists @c15t/react without c15t 3, so their imports were left as they are. Replace them with c15t@alpha and run packages-to-c15t again to point them at c15t/react or c15t/next.',
			},
		]);
	});

	it('keeps stylesheet imports while @c15t/react v2 stays installed', async () => {
		const css = `@import "@c15t/react/styles.css";
@import "@c15t/react/iab/styles.tw3.css";
`;
		const source = `import '@c15t/react/styles.css';
import { ConsentProvider } from '@c15t/react';
`;
		const sass = `@use '@c15t/react/styles.css';
@forward '@c15t/react/iab/styles.tw3.css';
`;
		const test = `vi.mock('@c15t/react/styles.tw3.css', () => ({}));
const path = require.resolve('@c15t/react/iab/styles.tw3.css');
`;
		const { read, result } = await run(
			{ '@c15t/react': '^2.3.0' },
			{
				'src/consent.test.ts': test,
				'src/consent.tsx': source,
				'src/index.css': css,
				'src/main.scss': sass,
			}
		);

		expect(result.errors).toEqual([]);
		expect(result.changedFiles).toEqual([]);
		expect(await read('src/index.css')).toBe(css);
		expect(await read('src/consent.tsx')).toBe(source);
		expect(await read('src/consent.test.ts')).toBe(test);
		expect(result.warnings).toEqual([
			{
				filePath: expect.stringMatching(/package\.json$/u),
				message:
					'package.json lists @c15t/react without c15t 3, so their imports were left as they are. Replace them with c15t@alpha and run packages-to-c15t again to point them at c15t/react or c15t/next.',
			},
		]);
	});

	it.each([
		['reads the installed version', { version: '2.3.0' }],
		['assumes v2 with nothing installed', undefined],
	])(
		'keeps stylesheet imports for @c15t/react from a catalog: %s',
		async (_name, installed) => {
			const css = `@import "@c15t/react/styles.css";
`;
			const { read } = await run(
				{ '@c15t/react': 'catalog:' },
				{
					...(installed && {
						'node_modules/@c15t/react/package.json': JSON.stringify(installed),
					}),
					'src/index.css': css,
				}
			);

			expect(await read('src/index.css')).toBe(css);
		}
	);

	it('removes stylesheet imports for @c15t/react from a catalog when v3 is installed', async () => {
		const { read } = await run(
			{ '@c15t/react': 'catalog:' },
			{
				'node_modules/@c15t/react/package.json': JSON.stringify({
					version: '3.0.0-alpha.9',
				}),
				'src/index.css': `@import "@c15t/react/styles.css";
`,
			}
		);

		expect(await read('src/index.css')).toBe('');
	});

	it('leaves v3 entries and other packages alone', async () => {
		const { result } = await run(
			{ c15t: '^3.0.0' },
			{
				'src/consent.tsx': `import { ConsentProvider } from 'c15t/react';
import { Banner } from '@c15t/react-native';
import { posthog } from '@c15t/integrations/posthog';
import { createC15tClient } from '@c15t/node-sdk';
`,
				'src/index.css': `@import 'c15t/react/styles.css';
@import '@c15t/react-native/styles.css';
`,
			}
		);

		expect(result.errors).toEqual([]);
		expect(result.changedFiles).toEqual([]);
	});

	it('keeps a comment between removed stylesheet imports', async () => {
		const { read, result } = await run(
			{ c15t: '^3.0.0' },
			{
				'src/consent.tsx': `import '@c15t/react/styles.css'; /* application note */ import '@c15t/react/iab/styles.css';
import '@c15t/nextjs/styles.css';
// keep this note
import '@c15t/nextjs/iab/styles.css';
import { ConsentProvider } from '@c15t/react';
`,
			}
		);

		expect(result.errors).toEqual([]);
		expect(await read('src/consent.tsx')).toBe(`/* application note */
// keep this note
import { ConsentProvider } from 'c15t/react';
`);
	});

	it('adds the styles TODO below an unrelated c15t TODO', async () => {
		const files = {
			'src/consent.tsx': `// TODO(c15t v3): pick a theme
import '@c15t/react/styles.tw3.css';
`,
			'src/index.css': `/* TODO(c15t v3): pick a theme */
@import "@c15t/react/styles.css";
/* TODO(c15t v3): pick a theme */ @import "@c15t/react/iab/styles.css";
`,
		};
		const { read, result, rootDir } = await run(
			{ c15t: '^3.0.0', tailwindcss: '^3.4.0' },
			files
		);

		expect(result.errors).toEqual([]);
		const css = `/* TODO(c15t v3): pick a theme */
/* ${TODO} */
@import "c15t/react/styles.css";
/* TODO(c15t v3): pick a theme */ /* ${TODO} */ @import "c15t/react/iab/styles.css";
`;
		const source = `// TODO(c15t v3): pick a theme
// ${TODO}
import 'c15t/react/styles.css';
`;
		expect(await read('src/index.css')).toBe(css);
		expect(await read('src/consent.tsx')).toBe(source);

		const again = await codemod({ dryRun: false, projectRoot: rootDir });
		expect(again.changedFiles).toEqual([]);
		expect(await read('src/index.css')).toBe(css);
	});

	it('is idempotent and writes nothing in a dry run', async () => {
		const files = {
			'src/consent.tsx': `import { ConsentProvider } from '@c15t/react';
import '@c15t/react/styles.css';
`,
			'src/index.css': `@import "@c15t/react/styles.css";
`,
		};
		const dry = await run({ c15t: '^3.0.0' }, files, true);
		expect(dry.result.changedFiles).toHaveLength(2);
		expect(await dry.read('src/consent.tsx')).toBe(files['src/consent.tsx']);
		expect(await dry.read('src/index.css')).toBe(files['src/index.css']);

		const applied = await run({ c15t: '^3.0.0' }, files);
		const again = await codemod({
			dryRun: false,
			projectRoot: applied.rootDir,
		});
		expect(again.changedFiles).toEqual([]);
		expect(await applied.read('src/consent.tsx')).toBe(
			"import { ConsentProvider } from 'c15t/react';\n"
		);
	});
});
