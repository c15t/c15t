import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { cleanupProjects, createProject } from './__tests__/helpers';
import { runPackagesToC15tCodemod as codemod } from './packages-to-c15t';

const TODO =
	'TODO(c15t v3): c15t components add their own styles. Keep this import only with Tailwind CSS 3 or a named cascade layer, and set styles: false in the provider options.';

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
	plugins: [require("c15t/postcss-tailwind3"), require('tailwindcss')],
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
