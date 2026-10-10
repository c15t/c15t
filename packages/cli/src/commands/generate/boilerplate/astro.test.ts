import { createRequire } from 'node:module';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
	exampleDirectory,
	typecheckInExample,
} from './__tests__/example-project';
import { generateAstroBoilerplate } from './astro';

const compiler: {
	transform: (
		source: string,
		options: { filename: string }
	) => Promise<{
		code: string;
		diagnostics: { severity: number; text: string }[];
	}>;
} = createRequire(
	createRequire(path.join(exampleDirectory('astro'), 'package.json')).resolve(
		'astro/package.json'
	)
)('@astrojs/compiler');

const generate = (
	framework: 'astro' | 'astro-static',
	mode: 'offline' | 'hosted',
	scripts: string[]
) =>
	generateAstroBoilerplate({
		backendURL: mode === 'hosted' ? 'https://your-project.inth.app' : undefined,
		framework,
		mode,
		scripts,
	});

describe('Astro boilerplate', () => {
	it.each(
		(['astro', 'astro-static'] as const).flatMap((framework) =>
			(['offline', 'hosted'] as const).flatMap((mode) => [
				{ framework, mode, scripts: [] },
				{ framework, mode, scripts: ['google-tag-manager'] },
			])
		)
	)(
		'typechecks the $framework $mode config with scripts $scripts against the built packages',
		async ({ framework, mode, scripts }) => {
			const template = generate(framework, mode, scripts);
			expect(
				await typecheckInExample(
					framework === 'astro' ? 'astro' : 'astro-static',
					template.files,
					{ types: ['node'] }
				)
			).toBe('');
		},
		60_000
	);

	it('compiles the layout and keeps script callbacks in the browser entrypoint', async () => {
		const template = generate('astro', 'hosted', ['google-tag-manager']);
		const result = await compiler.transform(
			template.files['src/layouts/base.astro'] ?? '',
			{ filename: 'base.astro' }
		);
		expect(result.diagnostics.filter((item) => item.severity === 1)).toEqual(
			[]
		);
		// Astro serializes integration options, so functions stay out of them.
		expect(template.files['astro.config.mjs']).not.toContain(
			'googleTagManager('
		);
		expect(template.files['src/c15t.client.ts']).toContain('googleTagManager(');
		expect(template.files['src/layouts/base.astro']).toContain(
			'<ConsentDialogLink>Privacy settings</ConsentDialogLink>'
		);
	});

	it('picks the mode for each output', () => {
		expect(generate('astro', 'hosted', []).files['astro.config.mjs']).toContain(
			'integrations: [svelte(), c15t()],'
		);
		expect(
			generate('astro-static', 'hosted', []).files['astro.config.mjs']
		).toContain('c15t({ mode: hosted() })');
		expect(
			generate('astro-static', 'offline', []).files['astro.config.mjs']
		).toContain('c15t({ mode: offline() })');
		expect(generate('astro', 'hosted', []).files['src/c15t.client.ts']).toBe(
			undefined
		);
		expect(generate('astro', 'hosted', []).dependencies).toContain(
			'@astrojs/node'
		);
		expect(generate('astro-static', 'hosted', []).dependencies).not.toContain(
			'@astrojs/node'
		);
	});
});
