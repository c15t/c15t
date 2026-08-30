import { describe, expect, it } from 'vitest';

import {
	buildMonitorIssueBody,
	buildMonitorIssueTitle,
	buildMonitorSignature,
	failedPhases,
	planMonitorIssueActions,
	signatureFromIssueBody,
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

describe('failure signatures', () => {
	it('round-trips through the issue body marker', () => {
		const result = makeResult({
			ok: false,
			phases: {
				load: { ok: false },
				runtime: { ok: false },
			},
		});
		const body = buildMonitorIssueBody(result, makeReport([result]));

		expect(buildMonitorSignature(result)).toBe('load,runtime');
		expect(signatureFromIssueBody(body)).toBe('load,runtime');
		expect(signatureFromIssueBody(undefined)).toBeUndefined();
		expect(signatureFromIssueBody('no marker here')).toBeUndefined();
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

	it('sanitizes third-party text and notes overflowed error lists', () => {
		const errors = Array.from(
			{ length: 12 },
			(_, index) => `error ${index} with \`backticks\`\nand newlines`
		);
		const result = makeResult({
			ok: false,
			phases: {
				load: {
					ok: false,
					detail: 'loader said `<img src=x onerror=alert(1)>`',
				},
			},
			loader: {
				url: 'https://evil.example/`payload`',
				status: 500,
			},
			consoleErrors: errors,
		});
		const body = buildMonitorIssueBody(result, makeReport([result]));

		expect(body).not.toContain('`<img');
		expect(body).not.toContain('```payload');
		expect(body).toContain('…and 2 more');
		expect(body).not.toContain('and newlines\n-');
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
		expect(plan.update).toHaveLength(0);
		expect(plan.close).toHaveLength(0);
	});

	it('stays silent when a vendor keeps failing with the same signature', () => {
		const existingBody = buildMonitorIssueBody(failing, makeReport([failing]));
		const plan = planMonitorIssueActions(makeReport([failing]), [
			{
				number: 42,
				title: buildMonitorIssueTitle('posthog'),
				body: existingBody,
			},
		]);

		expect(plan.create).toHaveLength(0);
		expect(plan.update).toHaveLength(0);
		expect(plan.close).toHaveLength(0);
	});

	it('updates the issue when the failure signature changes', () => {
		const previous = makeResult({
			vendor: 'posthog',
			ok: false,
			phases: { runtime: { ok: false } },
		});
		const existingBody = buildMonitorIssueBody(
			previous,
			makeReport([previous])
		);
		const plan = planMonitorIssueActions(makeReport([failing]), [
			{
				number: 42,
				title: buildMonitorIssueTitle('posthog'),
				body: existingBody,
			},
		]);

		expect(plan.update).toHaveLength(1);
		expect(plan.update[0]?.issueNumber).toBe(42);
		expect(signatureFromIssueBody(plan.update[0]?.body)).toBe('load');
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
		expect(plan.update).toHaveLength(0);
		expect(plan.close).toHaveLength(0);
	});
});
