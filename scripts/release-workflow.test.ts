import { execFileSync, spawnSync } from 'node:child_process';
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

describe('release validation', () => {
	it('summarizes coverage against the selected release ancestor', () => {
		expect(readWorkflow('ci')).toMatchObject({
			jobs: {
				packages: {
					steps: expect.arrayContaining([
						expect.objectContaining({
							env: {
								CI_DIFF_BASE: `\${{ needs.repository.outputs.baseRef }}`,
							},
							name: 'Summarize coverage',
						}),
					]),
				},
			},
		});
	});

	it('runs Tegami in the trusted release workflow with provenance and Node 24', () => {
		expect(readWorkflow('ci')).toMatchObject({
			jobs: {
				repository: {
					steps: expect.arrayContaining([
						expect.objectContaining({
							uses: './.github/actions/setup',
							with: expect.objectContaining({ 'node-version': '24' }),
						}),
					]),
				},
			},
		});
		expect(readWorkflow('release')).toMatchObject({
			jobs: {
				publish: {
					steps: expect.arrayContaining([
						expect.objectContaining({
							uses: './.github/actions/setup',
							with: expect.objectContaining({
								built: `\${{ needs.checks.outputs.built }}`,
								'cache-scope': 'publish',
								'node-version': '24',
							}),
						}),
						expect.objectContaining({
							env: {
								GITHUB_TOKEN: `\${{ secrets.GITHUB_TOKEN }}`,
								NPM_CONFIG_PROVENANCE: 'true',
							},
							if: "steps.tip.outputs.current == 'true'",
							run: 'bun run tegami ci',
						}),
					]),
				},
			},
		});
	});
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

	it('queues only publishing, so release checks overlap', () => {
		expect(readWorkflow('release')).toMatchObject({
			concurrency: {
				group: `release-run-\${{ github.run_id }}`,
				queue: 'max',
			},
			jobs: {
				publish: {
					concurrency: {
						group: `release-\${{ github.ref }}`,
						queue: 'max',
					},
					needs: 'checks',
					// The tip check runs inside the release group, right before
					// Tegami, so a newer push that lands while this job waits stops it.
					steps: expect.arrayContaining([
						expect.objectContaining({
							id: 'tip',
							name: 'Skip superseded commits',
						}),
					]),
				},
			},
		});
		// A per-ref group here would queue release checks again from inside
		// the reusable workflow.
		expect(readWorkflow('ci')).toMatchObject({
			concurrency: {
				group: `ci-\${{ github.event.pull_request.number || github.run_id }}`,
			},
		});
	});

	it('opens version PRs on main and canary pushes and publishes nothing else', () => {
		const workflow = readWorkflow('release') as {
			jobs: { publish: { steps: { run?: string }[] } };
			on: { push: { branches: string[] } };
		};
		expect(workflow.on.push.branches).toEqual(['main', 'canary']);
		// Every publish goes through a merged version PR, canary included.
		expect(
			workflow.jobs.publish.steps.flatMap((step) =>
				step.run?.includes('tegami') ? [step.run] : []
			)
		).toEqual(['bun run tegami ci']);
	});

	it('requires an explicit manual opt-in to bypass release CI', () => {
		expect(readWorkflow('release')).toMatchObject({
			jobs: { publish: { needs: 'checks' } },
			on: {
				workflow_dispatch: {
					inputs: { skip_tests: { default: false, type: 'boolean' } },
				},
			},
		});
	});

	it.each([
		{ eventName: 'push', skipTests: undefined },
		{ eventName: 'push', skipTests: true },
		{ eventName: 'workflow_dispatch', skipTests: undefined },
		{ eventName: 'workflow_dispatch', skipTests: false },
		{ eventName: 'workflow_dispatch', skipTests: true },
	])(
		'gates $eventName publication with skip_tests=$skipTests',
		({ eventName, skipTests }) => {
			const workflow = readWorkflow('release') as {
				jobs: { checks: { if: string }; publish: { if: string } };
			};
			const bypass = eventName === 'workflow_dispatch' && skipTests === true;
			// These conditions use the same boolean syntax in Actions and JavaScript.
			// A status function prevents Actions from implicitly requiring success()
			// when the checks job was intentionally skipped.
			expect(workflow.jobs.publish.if).toContain('!cancelled()');
			for (const repository of ['c15t/c15t', 'fork/c15t']) {
				const github = { event_name: eventName, repository };
				const inputs = { skip_tests: skipTests };
				expect(
					runInNewContext(workflow.jobs.checks.if, { github, inputs })
				).toBe(repository === 'c15t/c15t' && !bypass);
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
		}
	);

	it('skips runtime comparisons in releases while keeping other checks required', () => {
		expect(readWorkflow('release')).toMatchObject({
			jobs: {
				checks: { with: { skip_mobile_device: true, skip_performance: true } },
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
						'mobile',
						'bundle',
						'performance',
					],
				},
				// The device builds are a build report, not a gate: a pod fetch that
				// breaks must not turn `CI complete` red.
				mobileBrowserOrDevice: {
					if: "needs.repository.outputs.mobileBrowserOrDevice == 'true' && !inputs.skip_mobile_device",
					needs: ['repository', 'build'],
					uses: './.github/workflows/mobile-device.yml',
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

	it('selects canary release checks since a successful ancestor and keeps full validation full', () => {
		expect(readWorkflow('release')).toMatchObject({
			jobs: {
				checks: {
					with: {
						release_affected: `\${{ github.ref == 'refs/heads/canary' }}`,
					},
				},
			},
		});
		expect(readWorkflow('ci')).toMatchObject({
			jobs: {
				repository: {
					steps: expect.arrayContaining([
						expect.objectContaining({
							env: { CI_RELEASE_SELECTION: `\${{ inputs.release_affected }}` },
							id: 'plan',
						}),
					]),
				},
			},
			on: {
				workflow_call: {
					inputs: { release_affected: { default: false, type: 'boolean' } },
				},
			},
		});
		expect(readWorkflow('validation')).not.toHaveProperty(
			'jobs.checks.with.release_affected'
		);
	});

	it('runs advisory app builds independently on release pushes', () => {
		expect(readWorkflow('mobile-device')).toMatchObject({
			jobs: {
				plan: {
					steps: expect.arrayContaining([
						expect.objectContaining({
							env: expect.objectContaining({
								CI_RELEASE_WORKFLOW: 'mobile-device.yml',
							}),
							run: 'bun scripts/ci-release-base.ts',
						}),
					]),
				},
			},
			on: { push: { branches: ['main', 'canary'] } },
		});
		expect(readWorkflow('release')).toMatchObject({
			jobs: { checks: { with: { skip_mobile_device: true } } },
		});
	});

	it('runs full canary comparisons separately on push, nightly, and manually', () => {
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
								BENCHMARK_SHARD: `\${{ matrix.id }}`,
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
								ref: `\${{ (github.event_name == 'schedule' || github.event_name == 'workflow_dispatch') && 'canary' || github.sha }}`,
							}),
						}),
					]),
				},
			},
			on: {
				push: { branches: ['canary'] },
				schedule: [{ cron: '43 2 * * *' }],
				workflow_dispatch: {
					inputs: {
						mode: { default: 'full' },
					},
				},
			},
		});
		expect(readWorkflow('benchmark-regression')).not.toHaveProperty(
			'on.workflow_call.inputs.advisory'
		);
		for (const input of ['head_ref', 'branch']) {
			expect(readWorkflow('benchmark-regression')).not.toHaveProperty(
				`on.workflow_dispatch.inputs.${input}`
			);
		}
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
