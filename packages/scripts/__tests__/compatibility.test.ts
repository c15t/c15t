import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import integrations from '../../integrations/package.json';

const root = join(import.meta.dirname, '..');
const wildcardPaths = readdirSync(join(root, '../integrations/dist'), {
	encoding: 'utf8',
	recursive: true,
})
	.filter((file) => file.endsWith('.js'))
	.map((file) => file.replaceAll('\\', '/').slice(0, -3));
const subpaths = [
	...new Set([
		...Object.keys(integrations.exports)
			.filter((key) => !key.includes('*'))
			.map((key) => key.slice(2)),
		...wildcardPaths,
	]),
];

describe('v3 scripts compatibility package', () => {
	it('preserves every public and wildcard export with the same runtime identity', () => {
		const result = execFileSync(
			'node',
			[
				'--input-type=module',
				'-e',
				`
import assert from 'node:assert/strict';
for (const subpath of ${JSON.stringify(subpaths)}) {
  const legacy = await import('@c15t/scripts/' + subpath);
  const current = await import('@c15t/integrations/' + subpath);
  assert.deepEqual(Object.keys(legacy), Object.keys(current), subpath);
  for (const key of Object.keys(current)) {
    assert.equal(legacy[key], current[key], subpath + ':' + key);
  }
}
console.log('compatible');
`,
			],
			{ cwd: root, encoding: 'utf8' }
		);
		expect(result.trim()).toBe('compatible');
	});

	it('preserves TypeScript imports and interoperability between both package names', () => {
		const tsc = join(root, 'node_modules/typescript/bin/tsc');
		const result = execFileSync(
			'node',
			[tsc, '--noEmit', '-p', join(root, 'tsconfig.json')],
			{
				cwd: root,
				encoding: 'utf8',
			}
		);
		expect(result).toBe('');
	});
});
