import { describe, expect, it } from 'vitest';

import { generateBoilerplateTemplate } from '../../../generate';
import { mergeFile } from '../../../generate/merge';
import { typecheckInExample } from './__tests__/example-project';
import type { BoilerplateFramework } from './types';

const BACKEND_URL = 'https://your-project.inth.app';

const variants = (['offline', 'hosted'] as const).flatMap((mode) => [
	{ mode, scripts: [] },
	{ mode, scripts: ['google-tag'] },
]);

const generated = (
	framework: BoilerplateFramework,
	mode: 'offline' | 'hosted',
	scripts: string[]
) =>
	generateBoilerplateTemplate({
		backendURL: mode === 'hosted' ? BACKEND_URL : undefined,
		framework,
		mode,
		scripts,
	});

describe('React, Next.js and JavaScript boilerplate', () => {
	it('typechecks both modes and script integration against built local v3 packages', async () => {
		const checks: [BoilerplateFramework, string, Record<string, string>][] = [
			['next-app', 'nextjs', {}],
			['next-pages', 'nextjs-pages-router', {}],
			// The quickstart's main.tsx renders the app's own root component.
			['react', 'react', { 'src/app.tsx': 'export const App = () => null;\n' }],
			['javascript', 'javascript', {}],
		];
		const results = await Promise.all(
			checks.flatMap(([framework, example, extra]) =>
				variants.map(async ({ mode, scripts }) => {
					const template = generated(framework, mode, scripts);
					const output = await typecheckInExample(
						example,
						{ ...template.files, ...extra },
						// `@/styles/globals.css` in the Pages Router `_app.tsx`.
						{ paths: { '@/*': ['./*'] } }
					);
					return output && `${framework} ${mode} ${scripts}: ${output}`;
				})
			)
		);
		expect(results.filter(Boolean).join('\n')).toBe('');
	}, 180_000);

	it('offline JavaScript uses the browser offline() with its recommended policy', () => {
		const template = generated('javascript', 'offline', []);
		const main = template.files['src/main.ts'];
		expect(main).toContain("import { init, offline } from '@c15t/browser';");
		expect(main).toMatch(/mode: offline\(\),/u);
		expect(template.files['.env']).toBeUndefined();
		expect(template.files['vite.config.ts']).toContain(
			"consentManifest({ onBuildError: 'runtime' })"
		);
	});

	it('adds the privacy settings link to an existing page once', () => {
		const template = generated('javascript', 'hosted', []);
		const page =
			'<html>\n\t<body>\n\t\t<div id="app"></div>\n\t</body>\n</html>\n';
		const merged = mergeFile(
			page,
			template.files['index.html'] ?? '',
			template.merge['index.html']
		);
		expect(merged).toBe(
			'<html>\n\t<body>\n\t\t<div id="app"></div>\n\t\t<a href="#c15t-preferences">Privacy settings</a>\n\t</body>\n</html>\n'
		);
		expect(mergeFile(merged, '', template.merge['index.html'])).toBe(merged);
		// A page indented with spaces keeps its own step.
		expect(
			mergeFile(
				'<body>\n  <main></main>\n</body>\n',
				'',
				template.merge['index.html']
			)
		).toBe(
			'<body>\n  <main></main>\n  <a href="#c15t-preferences">Privacy settings</a>\n</body>\n'
		);
	});

	it('loads c15t.js from the backend for a script tag, in hosted mode only', () => {
		const template = generated('html', 'hosted', []);
		const page =
			'<!doctype html>\n<html>\n\t<head>\n\t\t<title>Site</title>\n\t</head>\n\t<body>\n\t\t<main></main>\n\t</body>\n</html>\n';
		expect(
			mergeFile(
				page,
				template.files['index.html'] ?? '',
				template.merge['index.html']
			)
		).toBe(
			`<!doctype html>\n<html>\n\t<head>\n\t\t<title>Site</title>\n\t\t<script\n\t\t\tsrc="${BACKEND_URL}/c15t.js"\n\t\t\tdefer\n\t\t></script>\n\t</head>\n\t<body>\n\t\t<main></main>\n\t\t<a href="#c15t-preferences">Privacy settings</a>\n\t</body>\n</html>\n`
		);
		expect(template.dependencies).toEqual([]);
		expect(() => generated('html', 'offline', [])).toThrow('hosted mode');
		expect(() => generated('html', 'hosted', ['google-tag'])).toThrow(
			'data-c15t-category'
		);
	});

	it('keeps an existing Pages Router page and its data loading', () => {
		const template = generated('next-pages', 'hosted', []);
		const page = 'export default function Home() {\n\treturn null;\n}\n';
		expect(
			mergeFile(
				page,
				template.files['pages/index.tsx'] ?? '',
				template.merge['pages/index.tsx']
			)
		).toBe(page);
	});
});
