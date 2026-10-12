import { execFileSync } from 'node:child_process';
import {
	mkdirSync,
	mkdtempSync,
	realpathSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, it } from 'vitest';

it('links the canonical integrations package into every generated test app', () => {
	const root = mkdtempSync(join(tmpdir(), 'c15t-test-app-links-'));
	try {
		writeFileSync(join(root, 'package.json'), '{"name": "c15t-workspace"}');
		mkdirSync(join(root, 'packages/integrations'), { recursive: true });
		// No app manifests are present, so the install command only creates links.
		execFileSync(
			'bash',
			[
				fileURLToPath(new URL('./create-test-apps.sh', import.meta.url)),
				'install',
			],
			{
				cwd: root,
				stdio: 'pipe',
			}
		);
		for (const app of [
			'nextjs-app',
			'nextjs-pages',
			'vite-react',
			'svelte-app',
		]) {
			expect(
				realpathSync(
					join(root, '.test-apps', app, 'node_modules/@c15t/integrations')
				)
			).toBe(realpathSync(join(root, 'packages/integrations')));
		}
	} finally {
		rmSync(root, { force: true, recursive: true });
	}
});
