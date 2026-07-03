#!/usr/bin/env bun

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = process.argv[2]
	? resolve(process.argv[2])
	: join(import.meta.dirname, '..');

const stylePackages = [
	{ name: '@c15t/ui', dir: 'packages/ui' },
	{ name: '@c15t/react', dir: 'packages/react' },
	{ name: '@c15t/nextjs', dir: 'packages/nextjs' },
];

const entries = ['styles.tw3.css', 'iab/styles.tw3.css'];

function readRequiredFile(path: string): string {
	if (!existsSync(path)) {
		throw new Error(`Missing file: ${path}`);
	}

	return readFileSync(path, 'utf8');
}

function expectedProxy(entry: string): string {
	return entry.startsWith('iab/')
		? '@import "../dist/iab/styles.tw3.css";'
		: '@import "./dist/styles.tw3.css";';
}

const failures: string[] = [];

for (const stylePackage of stylePackages) {
	const packageDir = join(ROOT, stylePackage.dir);

	for (const entry of entries) {
		const rootEntryPath = join(packageDir, entry);
		const distEntryPath = join(packageDir, 'dist', entry);

		try {
			const rootEntry = readRequiredFile(rootEntryPath).trim();
			const distEntry = readRequiredFile(distEntryPath);

			if (rootEntry !== expectedProxy(entry)) {
				failures.push(
					`${stylePackage.name}/${entry} does not proxy to its dist entrypoint`
				);
			}

			if (/^\s*@import\b/m.test(distEntry)) {
				failures.push(
					`${stylePackage.name}/dist/${entry} still contains a nested @import`
				);
			}

			if (!distEntry.includes('c15t-ui-')) {
				failures.push(
					`${stylePackage.name}/dist/${entry} does not contain generated c15t UI rules`
				);
			}
		} catch (error) {
			failures.push(
				`${stylePackage.name}/${entry}: ${
					error instanceof Error ? error.message : String(error)
				}`
			);
		}
	}
}

if (failures.length > 0) {
	console.error('Tailwind v3 CSS entrypoint reproduction failed.');
	for (const failure of failures) {
		console.error(`- ${failure}`);
	}
	process.exit(1);
}

console.log(
	'Tailwind v3 CSS entrypoint reproduction passed: root TW3 files resolve physically and dist TW3 files inline generated c15t UI rules.'
);
