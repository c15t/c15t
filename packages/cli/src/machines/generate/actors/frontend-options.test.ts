import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createActor, toPromise } from 'xstate';

import { generateFiles } from '~/commands/generate/options/utils/generate-files';
import type { GenerateFilesOptions } from '~/commands/generate/options/utils/generate-files';
import type { CliContext } from '~/context/types';

import { frontendOptionsActor } from './prompts';

const directories: string[] = [];
afterEach(async () => {
	await Promise.all(
		directories
			.splice(0)
			.map((directory) => rm(directory, { force: true, recursive: true }))
	);
});

describe('JavaScript DevTools scaffolding', () => {
	it.each([false, true])(
		'preserves the DevTools choice through config generation, enabled=%s',
		async (enabled) => {
			const root = await mkdtemp(join(tmpdir(), 'c15t-devtools-fixture-'));
			directories.push(root);
			await writeFile(join(root, 'package.json'), '{}');
			const selectDevTools = vi.fn().mockResolvedValue(enabled);
			const cliContext = {
				cwd: root,
				framework: { pkg: 'c15t' },
				projectRoot: root,
			} as CliContext;
			const actor = createActor(frontendOptionsActor, {
				input: { cliContext, hasBackend: false, selectDevTools },
			});
			actor.start();
			const options = await toPromise(actor);
			expect(selectDevTools).toHaveBeenCalledOnce();
			expect(options.enableDevTools).toBe(enabled);
			await generateFiles({
				context: cliContext,
				enableDevTools: options.enableDevTools,
				mode: 'offline',
				spinner: {
					start: vi.fn(),
					stop: vi.fn(),
				} as GenerateFilesOptions['spinner'],
			});
			expect(
				(await readFile(join(root, 'c15t.config.ts'), 'utf8')).includes(
					'createDevTools({ kernel })'
				)
			).toBe(enabled);
		}
	);
});
