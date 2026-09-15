import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { expect, it } from 'vitest';

const execute = promisify(execFile);
const packageRoot = fileURLToPath(new URL('../../../', import.meta.url));

it.each([
	{ format: 'commonjs', load: "const { runCli } = require('@c15t/cli');" },
	{ format: 'module', load: "import { runCli } from '@c15t/cli';" },
])(
	'loads the published library from $format without launching the CLI',
	async ({ format, load }) => {
		const { stdout, stderr } = await execute(
			process.execPath,
			[
				`--input-type=${format}`,
				'--eval',
				`${load}
runCli(['--version', '--json']).then(result => {
 process.stdout.write(JSON.stringify(result));
});`,
			],
			{ cwd: packageRoot, timeout: 10_000 }
		);
		expect(stderr).toBe('');
		expect(JSON.parse(stdout)).toMatchObject({
			data: { version: expect.any(String) },
			exitCode: 0,
			schemaVersion: 1,
			success: true,
		});
	}
);
