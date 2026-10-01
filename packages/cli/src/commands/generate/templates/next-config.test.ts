import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Node, Project } from 'ts-morph';
import { afterEach, describe, expect, it } from 'vitest';

import { updateNextConfig } from './next-config';

const roots: string[] = [];
afterEach(() => {
	for (const root of roots.splice(0)) {
		rmSync(root, { force: true, recursive: true });
	}
});

const createProject = (files: Record<string, string> = {}) => {
	const root = mkdtempSync(join(tmpdir(), 'c15t-next-config-'));
	roots.push(root);
	for (const [path, contents] of Object.entries(files)) {
		writeFileSync(join(root, path), contents);
	}
	return root;
};

/** Reads the c15t rewrite's destination as the value Next.js will see. */
const readDestination = (filePath: string): unknown => {
	const file = new Project({ useInMemoryFileSystem: true }).createSourceFile(
		'next.config.ts',
		readFileSync(filePath, 'utf8')
	);
	expect(
		file
			.getPreEmitDiagnostics()
			.filter((diagnostic) => diagnostic.getCategory() === 1)
			.map((diagnostic) => diagnostic.getCode())
			// 2307: `next` is not installed in the temporary project.
			.filter((code) => code !== 2307)
	).toEqual([]);
	const destination = file
		.getDescendants()
		.find(
			(node) =>
				Node.isPropertyAssignment(node) && node.getName() === 'destination'
		);
	if (!Node.isPropertyAssignment(destination)) {
		throw new Error('No destination in the generated rewrite.');
	}
	const initializer = destination.getInitializerOrThrow();
	return Node.isStringLiteral(initializer)
		? initializer.getLiteralValue()
		: initializer.getText();
};

const backendURL = String.raw`https://consent.example.com/o'brien\path`;

describe('updateNextConfig', () => {
	it('writes a new config whose destination keeps quotes and backslashes', async () => {
		const root = createProject();
		const result = await updateNextConfig({ backendURL, projectRoot: root });

		expect(result.created).toBe(true);
		expect(readDestination(join(root, 'next.config.ts'))).toBe(
			`${backendURL}/:path*`
		);
	});

	it('adds the same destination to an existing config', async () => {
		const root = createProject({
			'next.config.ts': [
				"import type { NextConfig } from 'next';",
				'',
				'const config: NextConfig = { reactStrictMode: true };',
				'',
				'export default config;',
				'',
			].join('\n'),
		});
		const result = await updateNextConfig({ backendURL, projectRoot: root });

		expect(result.updated).toBe(true);
		expect(readDestination(join(root, 'next.config.ts'))).toBe(
			`${backendURL}/:path*`
		);
	});
});
