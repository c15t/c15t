import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

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

describe('release validation', () => {
	it('opts only releases into advisory runtime comparisons', () => {
		expect(readWorkflow('release')).toHaveProperty('jobs.checks.with', {
			performance_advisory: true,
		});
		expect(readWorkflow('validation')).not.toHaveProperty(
			'jobs.checks.with.performance_advisory'
		);
		expect(readWorkflow('ci')).toMatchObject({
			jobs: {
				performance: {
					with: { advisory: `\${{ inputs.performance_advisory || false }}` },
				},
			},
			on: {
				workflow_call: {
					inputs: { performance_advisory: { default: false, type: 'boolean' } },
				},
			},
		});
		expect(readWorkflow('benchmark-regression')).toMatchObject({
			jobs: {
				benchmark: {
					steps: expect.arrayContaining([
						expect.objectContaining({
							'continue-on-error': `\${{ inputs.advisory || false }}`,
							id: 'measure',
						}),
						expect.objectContaining({
							if: `\${{ !cancelled() && inputs.advisory && steps.measure.outcome == 'failure' }}`,
							run: expect.stringContaining('::warning::'),
						}),
						expect.objectContaining({
							if: `\${{ !cancelled() }}`,
							with: expect.objectContaining({ name: 'runtime-benchmarks' }),
						}),
					]),
				},
			},
			on: {
				workflow_call: {
					inputs: { advisory: { default: false, type: 'boolean' } },
				},
			},
		});
	});

	it.each(['repository', 'build', 'packages', 'backend', 'browser', 'bundle'])(
		'blocks failed or cancelled %s checks even when performance succeeds',
		(job) => {
			const script = execFileSync(
				'bun',
				[
					'-e',
					'console.log(Bun.YAML.parse(await Bun.stdin.text()).jobs.complete.steps[0].run)',
				],
				{
					encoding: 'utf8',
					input: readFileSync(
						new URL('../.github/workflows/ci.yml', import.meta.url),
						'utf8'
					),
				}
			);
			for (const result of ['success', 'skipped', 'failure', 'cancelled']) {
				const run = spawnSync('bash', ['-e', '-c', script], {
					env: {
						...process.env,
						RESULTS: JSON.stringify({
							[job]: { result },
							performance: { result: 'success' },
						}),
					},
				});
				expect(run.error).toBeUndefined();
				expect(run.status).toBe(
					['success', 'skipped'].includes(result) ? 0 : 1
				);
			}
		}
	);
});
