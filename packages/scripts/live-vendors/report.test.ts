import { describe, expect, it } from 'vitest';
import {
	buildMonitorIssueBody,
	buildMonitorIssueTitle,
	failedPhases,
	planMonitorIssueActions,
	vendorFromMonitorIssueTitle,
} from './report';
import type { LiveVendorReport, LiveVendorResult } from './types';

function makeResult(overrides: Partial<LiveVendorResult>): LiveVendorResult {
	return {
		vendor: 'microsoft-clarity',
		packageSubpath: 'microsoft-clarity',
		label: 'Microsoft Clarity',
		tier: 'full',
		ok: true,
		attempts: 1,
		phases: {},
		blockedRequests: 0,
		consoleErrors: [],
		pageErrors: [],
		...overrides,
	};
}

function makeReport(results: LiveVendorResult[]): LiveVendorReport {
	return {
		generatedAt: '2026-07-06T06:30:00.000Z',
		commitSha: 'abc1234',
		runUrl: 'https://github.com/c15t/c15t/actions/runs/1',
		results,
	};
}

describe('monitor issue titles', () => {
	it('round-trips vendor ids through the issue title', () => {
		const title = buildMonitorIssueTitle('microsoft-clarity');

		expect(title).toBe(
			'[vendor-script-monitor] microsoft-clarity live script contract failed'
		);
		expect(vendorFromMonitorIssueTitle(title)).toBe('microsoft-clarity');
	});

	it('rejects unrelated issue titles', () => {
		expect(vendorFromMonitorIssueTitle('Fix the docs')).toBeUndefined();
		expect(
			vendorFromMonitorIssueTitle('[vendor-script-monitor] something else')
		).toBeUndefined();
	});
});

describe('failedPhases', () => {
	it('lists failing phases in probe order', () => {
		const result = makeResult({
			ok: false,
			phases: {
				runtime: { ok: false, detail: 'stub never replaced' },
				consent: { ok: true },
				bootstrap: { ok: false, detail: 'queue missing' },
				load: { ok: true },
			},
		});

		expect(failedPhases(result)).toEqual(['bootstrap', 'runtime']);
	});
});

describe('buildMonitorIssueBody', () => {
	it('includes vendor, phases, loader, run metadata, and repro command', () => {
		const result = makeResult({
			ok: false,
			phases: {
				bootstrap: { ok: true, detail: 'queue seeded' },
				load: { ok: false, detail: 'loader responded with HTTP 500' },
			},
			loader: {
				url: 'https://www.clarity.ms/tag/c15tfake00',
				status: 500,
				contentType: 'text/html',
			},
			consoleErrors: ['boom'],
		});
		const body = buildMonitorIssueBody(result, makeReport([result]));

		expect(body).toContain('`microsoft-clarity`');
		expect(body).toContain('@c15t/scripts/microsoft-clarity');
		expect(body).toContain('**Failed phase(s)**: load');
		expect(body).toContain('https://www.clarity.ms/tag/c15tfake00');
		expect(body).toContain('HTTP 500');
		expect(body).toContain('abc1234');
		expect(body).toContain('https://github.com/c15t/c15t/actions/runs/1');
		expect(body).toContain(
			'bun run --filter @c15t/scripts test:live-vendors -- --vendor microsoft-clarity'
		);
		expect(body).toContain('Console errors');
	});
});

describe('planMonitorIssueActions', () => {
	const failing = makeResult({
		vendor: 'posthog',
		packageSubpath: 'posthog',
		label: 'PostHog',
		ok: false,
		phases: { load: { ok: false, detail: 'timeout' } },
	});
	const passing = makeResult({ vendor: 'microsoft-clarity' });

	it('creates an issue for a failing vendor without an open issue', () => {
		const plan = planMonitorIssueActions(makeReport([failing]), []);

		expect(plan.create).toHaveLength(1);
		expect(plan.create[0]?.title).toBe(buildMonitorIssueTitle('posthog'));
		expect(plan.comment).toHaveLength(0);
		expect(plan.close).toHaveLength(0);
	});

	it('comments instead of duplicating an open issue', () => {
		const plan = planMonitorIssueActions(makeReport([failing]), [
			{ number: 42, title: buildMonitorIssueTitle('posthog') },
		]);

		expect(plan.create).toHaveLength(0);
		expect(plan.comment).toHaveLength(1);
		expect(plan.comment[0]?.issueNumber).toBe(42);
	});

	it('closes the open issue when the vendor recovers', () => {
		const plan = planMonitorIssueActions(makeReport([passing]), [
			{ number: 7, title: buildMonitorIssueTitle('microsoft-clarity') },
		]);

		expect(plan.close).toHaveLength(1);
		expect(plan.close[0]?.issueNumber).toBe(7);
		expect(plan.create).toHaveLength(0);
	});

	it('leaves vendors outside the report untouched', () => {
		const plan = planMonitorIssueActions(makeReport([passing]), [
			{ number: 7, title: buildMonitorIssueTitle('microsoft-clarity') },
			{ number: 8, title: buildMonitorIssueTitle('segment') },
		]);

		expect(plan.close).toHaveLength(1);
		expect(plan.close[0]?.vendor).toBe('microsoft-clarity');
	});

	it('ignores skipped vendors and unrelated issues', () => {
		const skipped = makeResult({
			vendor: 'cloudflare-zaraz',
			ok: true,
			skipped: true,
			skipReason: 'edge-injected',
		});
		const plan = planMonitorIssueActions(makeReport([skipped]), [
			{ number: 1, title: 'Unrelated issue' },
		]);

		expect(plan.create).toHaveLength(0);
		expect(plan.comment).toHaveLength(0);
		expect(plan.close).toHaveLength(0);
	});
});
