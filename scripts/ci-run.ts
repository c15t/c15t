import { readFileSync } from 'node:fs';

import type { CiPlan } from './ci-plan';

const tasks = {
	build: 'build',
	testTypes: 'check-types:test',
	tests: 'test',
	types: 'check-types',
} as const;

const selection = process.argv[2] as keyof typeof tasks;
if (!(selection in tasks)) {
	throw new Error(`Unknown CI task: ${selection}`);
}
const plan: CiPlan = JSON.parse(readFileSync('ci-plan.json', 'utf8'));
const packages = plan[selection];
if (packages.length) {
	const child = Bun.spawn(
		[
			'bun',
			'turbo',
			'run',
			tasks[selection],
			`--concurrency=${selection === 'build' ? 4 : 2}`,
			...packages.map((name) => `--filter=${name}`),
			...process.argv.slice(3),
		],
		{ stderr: 'inherit', stdin: 'inherit', stdout: 'inherit' }
	);
	process.exitCode = await child.exited;
} else {
	process.stdout.write(`No ${selection} selected.\n`);
}
