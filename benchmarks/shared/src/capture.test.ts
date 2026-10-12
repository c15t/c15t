import { execFileSync, spawnSync } from 'node:child_process';
import {
	chmodSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, expect, it } from 'vitest';

const temporary: string[] = [];
afterEach(() => {
	for (const directory of temporary.splice(0)) {
		rmSync(directory, { force: true, recursive: true });
	}
});

it.each([0, 7])('attempts every suite and propagates suite exit %i', (code) => {
	const directory = mkdtempSync(join(tmpdir(), 'benchmark-capture-'));
	temporary.push(directory);
	const bin = join(directory, 'bin');
	mkdirSync(bin);
	const executable = join(bin, 'bunx');
	// Unit-test process stub only. This never emits benchmark measurements.
	writeFileSync(executable, `#!/bin/sh\nexit ${code}\n`);
	chmodSync(executable, 0o755);
	const checkout = execFileSync('git', ['rev-parse', '--show-toplevel'], {
		encoding: 'utf8',
	}).trim();
	const script = fileURLToPath(
		new URL('../scripts/capture.sh', import.meta.url)
	);
	const output = join(directory, 'out');
	const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
	const result = spawnSync('bash', [script, checkout, output], { env });
	expect(result.status).toBe(code === 0 ? 0 : 1);
	const statuses = readFileSync(join(output, 'exit-codes.txt'), 'utf8')
		.trim()
		.split('\n');
	expect(statuses).toHaveLength(8);
	expect(statuses.every((status) => status.endsWith(`=${code}`))).toBe(true);
	expect(spawnSync('bash', [script, checkout, output], { env }).status).toBe(1);
});
