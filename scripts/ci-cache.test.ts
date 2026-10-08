import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const read = (path: string) =>
	parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));

describe('completed CI task caches', () => {
	it('restores prior test caches before merging same-run library outputs', () => {
		const action = read('.github/actions/setup/action.yml');
		const { steps } = action.runs;
		const restore = steps.findIndex((step: { uses?: string }) =>
			step.uses?.startsWith('actions/cache/restore@')
		);
		const outputs = steps.findIndex((step: { uses?: string }) =>
			step.uses?.startsWith('actions/download-artifact@')
		);
		expect(restore).toBeGreaterThanOrEqual(0);
		expect(outputs).toBeGreaterThan(restore);
		expect(steps[restore]).not.toHaveProperty('if');
		expect(steps[restore].with.key).toContain('inputs.cache-scope');
	});

	it('saves each job after its work with a distinct key on every retry', () => {
		const ci = read('.github/workflows/ci.yml');
		for (const [job, scope, lastCommand] of [
			['repository', 'repository', 'bun turbo run build:docs'],
			['build', 'build', 'bun scripts/ci-run.ts build'],
			['packages', 'packages', 'bun scripts/ci-run.ts tests'],
			['backend', 'backend', 'bun turbo run test --filter=@c15t/backend'],
			['browser', `browser-\${{ matrix.kind }}`, 'bun scripts/ci-browser.ts'],
			[
				'mobile',
				`mobile-\${{ matrix.kind }}`,
				'bun run --cwd benchmarks/mobile bench:ci',
			],
		]) {
			const { steps } = ci.jobs[job ?? ''];
			const work = steps.findIndex(
				(step: { run?: string }) => step.run === lastCommand
			);
			const save = steps.findIndex(
				(step: { uses?: string }) =>
					step.uses === './.github/actions/save-turbo-cache'
			);
			expect(work, job).toBeGreaterThanOrEqual(0);
			expect(save, job).toBeGreaterThan(work);
			expect(steps[save].with.scope, job).toBe(scope);
			expect(steps[save].if, job).toContain(
				"github.event_name != 'pull_request'"
			);
		}
		const action = read('.github/actions/save-turbo-cache/action.yml');
		const { key } = action.runs.steps[1].with;
		expect(key).toContain('inputs.scope');
		expect(key).toContain('github.run_id');
		expect(key).toContain('github.run_attempt');
	});

	it('saves publication results after both release channels finish', () => {
		const release = read('.github/workflows/release.yml');
		const { steps } = release.jobs.publish;
		const save = steps.findIndex(
			(step: { uses?: string }) =>
				step.uses === './.github/actions/save-turbo-cache'
		);
		const commands = steps
			.map((step: { run?: string }, index: number) => ({
				index,
				run: step.run,
			}))
			.filter((step: { run?: string }) => step.run?.includes('bun run tegami'));
		expect(commands).toHaveLength(2);
		for (const { index } of commands) {
			expect(save).toBeGreaterThan(index);
		}
		expect(steps[save].with.scope).toBe('publish');
	});
});
