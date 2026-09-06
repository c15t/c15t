import { describe, expect, it, vi } from 'vitest';
import { createActor, toPromise } from 'xstate';

import { generateFiles } from '~/commands/generate/options/utils/generate-files';
import type { GenerateFilesOptions } from '~/commands/generate/options/utils/generate-files';
import type { CliContext } from '~/context/types';

import { frontendOptionsActor } from './prompts';

describe('JavaScript DevTools scaffolding', () => {
	it.each([false, true])(
		'preserves the DevTools choice through config generation, enabled=%s',
		async (enabled) => {
			const selectDevTools = vi.fn().mockResolvedValue(enabled);
			const cliContext = {
				cwd: '/test-js-app',
				framework: { pkg: 'c15t' },
				projectRoot: '/test-js-app',
			} as CliContext;
			const actor = createActor(frontendOptionsActor, {
				input: { cliContext, hasBackend: false, selectDevTools },
			});
			actor.start();
			const options = await toPromise(actor);
			expect(selectDevTools).toHaveBeenCalledOnce();
			expect(options.enableDevTools).toBe(enabled);
			const result = await generateFiles({
				context: cliContext,
				enableDevTools: options.enableDevTools,
				mode: 'offline',
				spinner: {
					start: vi.fn(),
					stop: vi.fn(),
				} as GenerateFilesOptions['spinner'],
			});
			expect(result.configContent?.includes('createDevTools({ kernel })')).toBe(
				enabled
			);
		}
	);
});
