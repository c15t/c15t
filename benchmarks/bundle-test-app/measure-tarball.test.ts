import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, expect, it } from 'vitest';

import { runTarballSize } from './measure-tarball';

const roots: string[] = [];
afterEach(() => {
	for (const root of roots.splice(0)) {
		rmSync(root, { force: true, recursive: true });
	}
});
const setup = (stdout: string, status = 0) => {
	const root = mkdtempSync(join(tmpdir(), 'c15t-pack-'));
	roots.push(root);
	const pack = () => ({
		error: undefined,
		output: [],
		pid: 1,
		signal: null,
		status,
		stderr: 'pack error',
		stdout,
	});
	return [root, pack] as const;
};
it('rejects pack failures instead of recording a zero-byte improvement', () => {
	expect(() => runTarballSize(...setup('', 1))).toThrow('npm pack failed');
});
it.each(['not-json', '', '[]', '[{}]', '[{"size":0}]'])(
	'rejects invalid pack output %s',
	(stdout) => {
		expect(() => runTarballSize(...setup(stdout))).toThrow();
	}
);
it.each([0, -1, '4', 5])(
	'rejects invalid or mismatched tarball size %s',
	(size) => {
		const [root, pack] = setup(
			JSON.stringify([{ filename: 'fixture.tgz', size }])
		);
		writeFileSync(join(root, 'fixture.tgz'), 'test');
		expect(() => runTarballSize(root, pack)).toThrow('Invalid npm pack size');
		expect(existsSync(join(root, 'fixture.tgz'))).toBe(false);
	}
);
it('records a real artifact and removes the temporary tarball', () => {
	const [root, pack] = setup(
		JSON.stringify([{ filename: 'fixture.tgz', size: 4 }])
	);
	writeFileSync(join(root, 'fixture.tgz'), 'test');
	expect(runTarballSize(root, pack)).toEqual({ notes: [], size: 4 });
	expect(existsSync(join(root, 'fixture.tgz'))).toBe(false);
});
