import { describe, expect, it } from 'vitest';

import { typecheckInExample } from './__tests__/example-project';
import { generateTanStackStartBoilerplate } from './tanstack-start';

const generate = (mode: 'offline' | 'hosted', scripts: string[]) =>
	generateTanStackStartBoilerplate({
		backendURL: mode === 'hosted' ? 'https://your-project.inth.app' : undefined,
		framework: 'tanstack-start',
		mode,
		scripts,
	});

describe('TanStack Start boilerplate', () => {
	it.each(
		(['offline', 'hosted'] as const).flatMap((mode) => [
			{ mode, scripts: [] },
			{ mode, scripts: ['google-tag-manager'] },
		])
	)(
		'typechecks the $mode root route with scripts $scripts against the built packages',
		async ({ mode, scripts }) => {
			const template = generate(mode, scripts);
			expect(
				await typecheckInExample('tanstack-start', template.files, {
					types: ['vite/client', 'node'],
				})
			).toBe('');
		},
		60_000
	);

	it('carries the config in the loader state instead of ConsentRoot props', () => {
		const root = generate('hosted', []).files['src/routes/__root.tsx'];
		expect(root).toContain('createConsentStateHandler()');
		expect(root).toContain('<ConsentRoot state={consent}>');
		expect(root).not.toContain('backendURL');
		expect(root).not.toContain('initRoute');
		expect(root).toContain('createServerFn({ method:');
	});

	it('resolves offline mode on the server without a backend', () => {
		const template = generate('offline', []);
		expect(template.files['src/routes/__root.tsx']).toContain(
			'createConsentStateHandler({ mode: offline() })'
		);
		expect(template.files['vite.config.ts']).toContain(
			"consentManifest({ onBuildError: 'runtime' })"
		);
		expect(template.files['.env']).toBeUndefined();
	});
});
