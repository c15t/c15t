import { readdirSync, readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

interface Job {
	'runs-on'?: string;
	strategy?: { matrix?: { include?: { runner?: string }[] } };
}

const workflowsDir = new URL('../.github/workflows/', import.meta.url);

const workflows = readdirSync(workflowsDir)
	.filter((file) => file.endsWith('.yml'))
	.map((file) => {
		const workflow = parse(readFileSync(new URL(file, workflowsDir), 'utf8'));
		return {
			file,
			jobs: Object.values<Job>(workflow.jobs ?? {}),
			triggers: Object.keys(workflow.on ?? {}),
		};
	});

// Reusable workflows run with the calling PR's event, so they count as well.
const runsPullRequestCode = (triggers: string[]) =>
	triggers.some((trigger) =>
		['pull_request', 'pull_request_target', 'workflow_call'].includes(trigger)
	);

const runnerLabels = (jobs: Job[]) =>
	jobs.flatMap((job) => [
		...(job['runs-on'] ? [job['runs-on']] : []),
		...(job.strategy?.matrix?.include ?? []).flatMap((entry) =>
			entry.runner ? [entry.runner] : []
		),
	]);

const resolve = (label: string, fork: boolean): string => {
	const expression = /^\$\{\{(?<body>.*)\}\}$/su.exec(label)?.groups?.body;
	if (!expression) {
		return label;
	}
	return runInNewContext(expression, {
		github: { event: { pull_request: { head: { repo: { fork } } } } },
	});
};

const prWorkflows = workflows.filter(({ triggers }) =>
	runsPullRequestCode(triggers)
);

// Depot's Actions and Turbo caches are shared by every branch of the
// repository. A fork's code must not write entries that trusted runs restore.
describe('CI runners', () => {
	it.each(prWorkflows.map(({ file }) => file))(
		'%s keeps fork pull requests off Depot runners',
		(file) => {
			const { jobs } = workflows.find((item) => item.file === file) ?? {
				jobs: [],
			};
			for (const label of runnerLabels(jobs)) {
				if (!label.includes('depot-')) {
					continue;
				}
				expect(resolve(label, true), label).toBe('ubuntu-latest');
				expect(resolve(label, false), label).toMatch(/^depot-/u);
			}
		}
	);

	it('finds Depot runners in pull request workflows', () => {
		expect(
			prWorkflows.flatMap(({ jobs }) =>
				runnerLabels(jobs).filter((label) => label.includes('depot-'))
			).length
		).toBeGreaterThan(0);
	});
});
