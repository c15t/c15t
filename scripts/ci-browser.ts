import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { startStaticServer } from '../internals/next-compat/shared/src/suite/static-server';
import { runCommand } from './browser-process';

const kind = process.env.CI_INTEGRATION;
const targets = (process.env.CI_TARGETS ?? '').split(',').filter(Boolean);
if (!targets.length) {
	throw new Error('An integration target is required.');
}
const failures: string[] = [];
const results: string[] = [];
mkdirSync('.ci-reports', { recursive: true });

const check = async function check(
	name: string,
	command: string[],
	env = process.env
) {
	const start = Date.now();
	try {
		await runCommand(command, { env });
		results.push(
			`| ${name} | Passed | ${((Date.now() - start) / 1000).toFixed(1)}s |`
		);
	} catch (error) {
		const message = String(error);
		failures.push(name);
		results.push(
			`| ${name} | Failed | ${((Date.now() - start) / 1000).toFixed(1)}s |`
		);
		writeFileSync(
			`.ci-reports/${name.replaceAll(/[^a-z0-9-]/giu, '-')}.log`,
			message
		);
		process.stderr.write(`${message}\n`);
	}
};

const parity = async function parity() {
	await runCommand([
		'bun',
		'turbo',
		'run',
		'build',
		'--concurrency=2',
		...targets.map((target) => `--filter=@c15t/storybook-${target}`),
	]);
	const servers: Awaited<ReturnType<typeof startStaticServer>>[] = [];
	const env: NodeJS.ProcessEnv = {
		...process.env,
		PARITY_FRAMEWORKS: targets.join(','),
	};
	try {
		for (const target of targets) {
			// oxlint-disable-next-line no-await-in-loop -- Keep each server's cleanup registered before starting another.
			const server = await startStaticServer(
				resolve(`apps/storybook-${target}/storybook-static`)
			);
			servers.push(server);
			env[`${target.toUpperCase()}_STORYBOOK_URL`] = server.url;
		}
		await check(
			'Framework parity',
			[
				'bun',
				'run',
				'--cwd',
				'apps/parity-runner',
				'test:parity',
				'--ignore-snapshots',
			],
			env
		);
		for (const [index, target] of targets.entries()) {
			// oxlint-disable-next-line no-await-in-loop -- Reuse each built Storybook without competing browser runs.
			await check(
				`${target} interactions`,
				['bun', 'run', '--cwd', `apps/storybook-${target}`, 'test-storybook'],
				{ ...env, STORYBOOK_URL: servers[index]?.url ?? '' }
			);
		}
	} finally {
		await Promise.all(servers.map((server) => server.close()));
	}
};

try {
	if (kind === 'examples') {
		for (const target of targets) {
			// oxlint-disable-next-line no-await-in-loop -- Isolate builds and browsers while retaining all failures.
			await check(
				`${target} example`,
				['bun', 'run', '--cwd', 'examples/shared', 'test'],
				{ ...process.env, EXAMPLE_TARGET: target }
			);
		}
	} else if (kind === 'compat') {
		for (const target of targets) {
			// oxlint-disable-next-line no-await-in-loop -- Compatibility cells pack into their own node_modules.
			await check(`Next ${target}`, [
				'bun',
				'turbo',
				'run',
				'test:compat',
				`--filter=@c15t/next-compat-${target}`,
			]);
		}
	} else if (kind === 'parity') {
		await parity();
	} else if (kind === 'journeys') {
		await check(
			'SSR consent journeys',
			['bun', 'run', '--cwd', 'examples/shared', 'test:ssr'],
			{ ...process.env, C15T_E2E_APPS: targets.join(',') }
		);
	} else if (kind === 'styles') {
		await runCommand(['bun', 'run', 'compat:styles:build', '--concurrency=2']);
		await check('CSS compatibility', ['bun', 'run', 'compat:styles:verify']);
	} else {
		throw new Error(`Unknown integration: ${kind}`);
	}
} finally {
	const summary = `## Browser integration: ${kind}\n\n| Contract | Result | Duration |\n| --- | --- | --- |\n${results.join('\n')}\n`;
	writeFileSync(`.ci-reports/${kind}.md`, summary);
	if (process.env.GITHUB_STEP_SUMMARY) {
		appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
	}
}
if (failures.length) {
	throw new Error(`Failed integration contracts: ${failures.join(', ')}`);
}
