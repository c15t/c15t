import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assert, expect, test } from 'vitest';

// This package uses TypeScript 7's CLI; the root has TypeScript 6's compiler API.
import ts from '../../../node_modules/typescript/lib/typescript.js';
import {
	findRegions,
	renderExampleRegion,
} from '../../../scripts/example-doc-sources';

const root = fileURLToPath(new URL('../../..', import.meta.url));

test.each([
	['customer-io-configuration', 'customer-io'],
	['customer-io-proxy', 'customer-io-proxy'],
])(
	'%s compiles as a standalone rendered example',
	async (name, sourceFileName) => {
		const source = `internals/doc-snippets/javascript/src/${sourceFileName}.ts`;
		const region = findRegions(
			source,
			readFileSync(resolve(root, source), 'utf8')
		).find((candidate) => candidate.name === name);
		assert(region, `Missing docs:${name} region.`);
		const rendered = await renderExampleRegion(root, region);
		expect(readFileSync(resolve(root, region.destination), 'utf8')).toBe(
			rendered
		);
		const code = rendered.match(/^```ts[^\n]*\n(?<code>[\s\S]*?)\n```$/mu)
			?.groups?.code;
		assert(code !== undefined, `Missing TypeScript fence in docs:${name}.`);

		const file = resolve(root, dirname(region.source), `${name}.standalone.ts`);
		const options: ts.CompilerOptions = {
			lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
			module: ts.ModuleKind.ESNext,
			moduleResolution: ts.ModuleResolutionKind.Bundler,
			noEmit: true,
			skipLibCheck: true,
			strict: true,
			target: ts.ScriptTarget.ES2022,
			types: [],
		};
		const host = ts.createCompilerHost(options);
		const resolved = ts.resolveModuleName(
			'@c15t/integrations/customer-io',
			file,
			options,
			host
		).resolvedModule;
		expect(resolved?.extension).toBe(ts.Extension.Dts);
		const { getSourceFile } = host;
		host.getSourceFile = (fileName, languageVersion, onError, shouldCreate) =>
			fileName === file
				? ts.createSourceFile(fileName, code, languageVersion)
				: getSourceFile(fileName, languageVersion, onError, shouldCreate);
		const program = ts.createProgram([file], options, host);
		const diagnostics = ts.getPreEmitDiagnostics(program);
		expect(ts.formatDiagnosticsWithColorAndContext(diagnostics, host)).toBe('');
	}
);
