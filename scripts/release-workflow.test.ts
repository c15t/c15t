import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

import { describe, expect, it } from 'vitest';

const readWorkflow = function readWorkflow(name: string): unknown {
	return JSON.parse(
		execFileSync(
			'bun',
			[
				'-e',
				'console.log(JSON.stringify(Bun.YAML.parse(await Bun.stdin.text())))',
			],
			{
				encoding: 'utf8',
				input: readFileSync(
					new URL(`../.github/workflows/${name}.yml`, import.meta.url),
					'utf8'
				),
			}
		)
	);
};

describe('release workflow', () => {
	it('releases only release/v2 and publishes only through Tegami', () => {
		const workflow = readWorkflow('release') as {
			jobs: { publish: { steps: { run?: string }[] } };
			on: { push: { branches: string[] } };
		};
		expect(workflow.on.push.branches).toEqual(['release/v2']);
		expect(
			workflow.jobs.publish.steps.flatMap((step) =>
				step.run?.includes('tegami') ? [step.run] : []
			)
		).toEqual(['bun run tegami ci']);
	});

	it('publishes with npm trusted publishing and provenance, without an npm token', () => {
		expect(readWorkflow('release')).toMatchObject({
			jobs: {
				publish: {
					permissions: { 'id-token': 'write' },
					'runs-on': 'ubuntu-latest',
					steps: expect.arrayContaining([
						expect.objectContaining({
							with: expect.objectContaining({ 'node-version': '24' }),
						}),
						expect.objectContaining({
							env: expect.objectContaining({
								// biome-ignore lint/suspicious/noTemplateCurlyInString: GitHub Actions expression.
								GITHUB_TOKEN: '${{ secrets.GITHUB_TOKEN }}',
								NPM_CONFIG_PROVENANCE: 'true',
							}),
							if: "steps.tip.outputs.current == 'true'",
							run: 'bun run tegami ci',
						}),
					]),
				},
			},
		});
		const source = readFileSync(
			new URL('../.github/workflows/release.yml', import.meta.url),
			'utf8'
		);
		expect(source).not.toMatch(/NPM_TOKEN|NODE_AUTH_TOKEN/u);
	});

	it('runs the CI checks before publishing', () => {
		expect(readWorkflow('release')).toMatchObject({
			jobs: {
				checks: { uses: './.github/workflows/ci.yml' },
				publish: { needs: 'checks' },
			},
		});
		expect(readWorkflow('ci')).toHaveProperty('on.workflow_call');
	});

	it.each([
		{ eventName: 'push', skipTests: undefined },
		{ eventName: 'push', skipTests: true },
		{ eventName: 'workflow_dispatch', skipTests: undefined },
		{ eventName: 'workflow_dispatch', skipTests: false },
		{ eventName: 'workflow_dispatch', skipTests: true },
	])('gates $eventName publication with skip_tests=$skipTests', ({
		eventName,
		skipTests,
	}) => {
		const workflow = readWorkflow('release') as {
			jobs: { checks: { if: string }; publish: { if: string } };
		};
		const bypass = eventName === 'workflow_dispatch' && skipTests === true;
		// These conditions use the same boolean syntax in Actions and JavaScript.
		for (const repository of ['c15t/c15t', 'fork/c15t']) {
			const github = { event_name: eventName, repository };
			const inputs = { skip_tests: skipTests };
			expect(runInNewContext(workflow.jobs.checks.if, { github, inputs })).toBe(
				repository === 'c15t/c15t' && !bypass
			);
			for (const result of ['success', 'skipped', 'failure', 'cancelled']) {
				for (const cancelled of [false, true]) {
					expect(
						Boolean(
							runInNewContext(workflow.jobs.publish.if, {
								cancelled: () => cancelled,
								github,
								inputs,
								needs: { checks: { result } },
							})
						)
					).toBe(
						!cancelled &&
							repository === 'c15t/c15t' &&
							(result === 'success' || (bypass && result === 'skipped'))
					);
				}
			}
		}
	});
});
