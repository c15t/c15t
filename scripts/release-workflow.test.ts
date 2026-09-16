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
	it('keeps npm trusted publishing on a GitHub-hosted runner', () => {
		expect(readWorkflow('release')).toMatchObject({
			jobs: {
				publish: {
					permissions: { 'id-token': 'write' },
					'runs-on': 'ubuntu-latest',
				},
			},
		});
	});

	it('skips runtime comparisons in releases while keeping other checks required', () => {
		expect(readWorkflow('release')).toMatchObject({
			jobs: {
				checks: { with: { skip_performance: true } },
				publish: { needs: 'checks' },
			},
		});
		expect(readWorkflow('validation')).not.toHaveProperty(
			'jobs.checks.with.skip_performance'
		);
		expect(readWorkflow('ci')).toMatchObject({
			jobs: {
				complete: {
					needs: [
						'repository',
						'build',
						'packages',
						'backend',
						'browser',
						'bundle',
						'performance',
					],
				},
				performance: {
					if: "needs.repository.outputs.performance == 'true' && !inputs.skip_performance",
					with: {
						mode: `\${{ github.event_name != 'pull_request' && 'full' || 'quick' }}`,
					},
				},
			},
			on: {
				workflow_call: {
					inputs: { skip_performance: { default: false, type: 'boolean' } },
				},
			},
		});
	});

	it('runs full v3 comparisons separately on push, nightly, and manually', () => {
		expect(readWorkflow('benchmark-regression')).toMatchObject({
			jobs: {
				benchmark: {
					needs: 'plan',
					steps: expect.arrayContaining([
						expect.objectContaining({
							with: expect.objectContaining({
								ref: `\${{ needs.plan.outputs.head_sha }}`,
							}),
						}),
						expect.objectContaining({
							env: expect.objectContaining({
								BENCHMARK_BASE_REF: `\${{ needs.plan.outputs.base_sha }}`,
								BENCHMARK_MODE: `\${{ inputs.mode || 'full' }}`,
								BENCHMARK_PACKAGE: `\${{ matrix.package }}`,
							}),
							run: 'bun scripts/benchmark-run.ts "$BENCHMARK_MODE"',
						}),
						expect.objectContaining({
							if: `\${{ !cancelled() }}`,
							with: expect.objectContaining({
								name: `runtime-benchmarks-\${{ matrix.id }}`,
							}),
						}),
					]),
					strategy: {
						'fail-fast': false,
						matrix: `\${{ fromJSON(needs.plan.outputs.matrix) }}`,
					},
				},
				plan: {
					steps: expect.arrayContaining([
						expect.objectContaining({
							with: expect.objectContaining({
								ref: `\${{ inputs.head_ref || (github.event_name == 'schedule' && 'v3') || github.sha }}`,
							}),
						}),
					]),
				},
			},
			on: {
				push: { branches: ['v3'] },
				schedule: [{ cron: '43 2 * * *' }],
				workflow_dispatch: {
					inputs: { head_ref: { default: 'v3' }, mode: { default: 'full' } },
				},
			},
		});
		expect(readWorkflow('benchmark-regression')).not.toHaveProperty(
			'on.workflow_call.inputs.advisory'
		);
		expect(readWorkflow('benchmark-regression')).not.toMatchObject({
			jobs: {
				benchmark: {
					steps: expect.arrayContaining([
						expect.objectContaining({ 'continue-on-error': expect.anything() }),
					]),
				},
			},
		});
	});

	it.each(['repository', 'build', 'packages', 'backend', 'browser', 'bundle'])(
		'blocks failed or cancelled %s checks when release benchmarks are skipped',
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
							performance: { result: 'skipped' },
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
