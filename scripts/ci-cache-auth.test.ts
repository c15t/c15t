import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const read = (path: string) =>
	parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));

const action = read('.github/actions/setup/action.yml');
const authentication = action.runs.steps.find((step: { uses?: string }) =>
	step.uses?.startsWith('vercel/setup-turborepo-remote-cache-action@')
);

const authenticates = (
	event: string,
	ref: string,
	repository = 'c15t/c15t'
): boolean =>
	runInNewContext(authentication.if, {
		contains: (values: string[], value: string) => values.includes(value),
		fromJSON: JSON.parse,
		github: { event_name: event, ref, repository },
	});

describe('CI remote cache authentication', () => {
	it.each(['main', 'canary', '2.0.0', 'v3'])(
		'authenticates trusted runs on %s',
		(branch) => {
			for (const event of ['push', 'schedule', 'workflow_dispatch']) {
				expect(authenticates(event, `refs/heads/${branch}`)).toBe(true);
			}
		}
	);

	it('denies PRs, forks, and other branches even if one identity field matches', () => {
		for (const event of ['pull_request', 'pull_request_target']) {
			expect(authenticates(event, 'refs/heads/v3')).toBe(false);
			expect(authenticates(event, 'refs/pull/1426/merge')).toBe(false);
		}
		expect(authenticates('push', 'refs/heads/v3', 'contributor/c15t')).toBe(
			false
		);
		expect(authenticates('workflow_dispatch', 'refs/heads/feature')).toBe(
			false
		);
		expect(authenticates('issue_comment', 'refs/heads/v3')).toBe(false);
	});

	it('selects a cache policy and revokes the short-lived token after the job', () => {
		expect(authentication.uses).toMatch(/@[a-f\d]{40}$/u);
		expect(authentication.with).toMatchObject({
			audience: 'https://vercel.com/inth',
			policy: `\${{ env.TURBO_CACHE_POLICY }}`,
			revoke: true,
			team: `\${{ env.TURBO_TEAM }}`,
		});
	});

	it('reads repository variables in workflows, where GitHub supports that context', () => {
		expect(JSON.stringify(action)).not.toMatch(
			/\$\{\{[^}]*\b(?:vars|secrets)\s*\./u
		);
		for (const name of [
			'ci',
			'release',
			'mobile-device',
			'bundle-analysis',
			'benchmark-regression',
		]) {
			expect(read(`.github/workflows/${name}.yml`).env).toMatchObject({
				TURBO_CACHE_POLICY: `\${{ vars.TURBO_CACHE_POLICY }}`,
				TURBO_TEAM: `\${{ vars.TURBO_TEAM }}`,
			});
		}
	});

	it('grants OIDC only to jobs that authenticate or call authenticated workflows', () => {
		interface WorkflowJob {
			permissions?: Record<string, string>;
			steps?: { uses?: string }[];
			uses?: string;
		}
		for (const name of [
			'ci',
			'release',
			'mobile-device',
			'validation',
			'bundle-analysis',
			'benchmark-regression',
		]) {
			const workflow = read(`.github/workflows/${name}.yml`);
			expect(workflow.permissions, name).not.toHaveProperty('id-token');
			for (const [id, job] of Object.entries<WorkflowJob>(workflow.jobs)) {
				const usesOidc =
					job.steps?.some((step) => step.uses === './.github/actions/setup') ||
					job.uses?.startsWith('./.github/workflows/');
				expect(job.permissions?.['id-token'], `${name}.${id}`).toBe(
					usesOidc ? 'write' : undefined
				);
			}
		}
		const release = read('.github/workflows/release.yml');
		for (const job of ['checks', 'publish']) {
			expect(release.jobs[job].permissions).toHaveProperty('id-token', 'write');
		}
		expect(read('.github/workflows/validation.yml').permissions).toHaveProperty(
			'actions',
			'read'
		);
	});

	it('does not inject or forward stored Vercel API secrets', () => {
		for (const name of ['ci', 'release', 'mobile-device']) {
			const workflow = JSON.stringify(read(`.github/workflows/${name}.yml`));
			expect(workflow).not.toContain('secrets.TURBO_TOKEN');
			expect(workflow).not.toContain('secrets.TURBO_TEAM');
			expect(read(`.github/workflows/${name}.yml`)).not.toHaveProperty(
				'on.workflow_call.secrets.TURBO_TOKEN'
			);
		}
	});
});
