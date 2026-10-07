import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, test, vi } from 'vitest';

import { consentManifest } from '../build';

const directories: string[] = [];

afterEach(async () => {
	await Promise.all(
		directories
			.splice(0)
			.map((directory) => rm(directory, { force: true, recursive: true }))
	);
});

describe('TanStack Start manifest generation', () => {
	test.each([
		{ expectedImport: 'c15t/tanstack-start/static', settings: {} },
		{
			expectedImport: 'c15t/tanstack-start/static',
			settings: { importSource: undefined },
		},
		{
			expectedImport: '@c15t/tanstack-start/static',
			settings: { importSource: '@c15t/tanstack-start/static' },
		},
	])(
		'generates the configured type import with settings $settings',
		async ({ expectedImport, settings }) => {
			const root = await mkdtemp(join(tmpdir(), 'c15t-tanstack-manifest-'));
			directories.push(root);
			const fetchSpy = vi.fn<typeof globalThis.fetch>(() =>
				Promise.resolve(
					Response.json({
						branding: 'c15t',
						revision: 'tanstack-build',
						schemaVersion: 2,
					})
				)
			);
			await consentManifest({
				...settings,
				backendURL: 'https://consent.example.com',
				fetch: fetchSpy,
			}).configResolved({ root });
			const source = await readFile(join(root, 'src/c15t-manifest.ts'), 'utf8');
			expect(source).toContain(`from '${expectedImport}'`);
			expect(source).toContain('satisfies ConsentManifest');
		}
	);
});
