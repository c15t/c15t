import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { expect, it } from 'vitest';

import { browserInstallations } from './install-browsers';

it('finds nested installed versions rather than manifest ranges, independently for each checkout', () => {
	const root = mkdtempSync(join(tmpdir(), 'c15t-browsers-'));
	const json = (path: string, value: unknown) => {
		mkdirSync(dirname(path), { recursive: true });
		writeFileSync(path, JSON.stringify(value));
	};
	try {
		for (const [arm, version] of [
			['head', '1.61.1'],
			['base', '1.57.0'],
		] as const) {
			const checkout = join(root, arm);
			json(join(checkout, 'package.json'), {
				devDependencies: { playwright: '^1.50.0' },
				workspaces: ['apps/*'],
			});
			json(join(checkout, 'node_modules/playwright/package.json'), { version });
			json(join(checkout, 'apps/nuxt/package.json'), {
				devDependencies: { playwright: '^1.58.0' },
				name: 'nuxt',
			});
			json(join(checkout, 'apps/nuxt/node_modules/playwright/package.json'), {
				version: '1.58.2',
			});
			json(join(checkout, 'apps/parity/package.json'), {
				devDependencies: { '@playwright/test': '^1.50.0' },
				name: 'parity',
			});
			json(
				join(
					checkout,
					'apps/parity/node_modules/@playwright/test/package.json'
				),
				{ version }
			);
			expect([...browserInstallations(checkout).keys()].sort()).toEqual(
				[version, '1.58.2'].sort()
			);
		}
	} finally {
		rmSync(root, { force: true, recursive: true });
	}
});
