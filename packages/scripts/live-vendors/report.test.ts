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

const makeResult = function makeResult(
	overrides: Partial<LiveVendorResult>
): LiveVendorResult {
	return {
		attempts: 1,
		blockedRequests: 0,
		consoleErrors: [],
		label: 'Microsoft Clarity',
		ok: true,
		packageSubpath: 'microsoft-clarity',
		pageErrors: [],
		phases: {},
		tier: 'full',
		vendor: 'microsoft-clarity',
		...overrides,
	};
};

const makeReport = function makeReport(
	results: LiveVendorResult[]
): LiveVendorReport {
	return {
		commitSha: 'abc1234',
		generatedAt: '2026-07-06T06:30:00.000Z',
		results,
		runUrl: 'https://github.com/c15t/c15t/actions/runs/1',
	};
};

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
				bootstrap: { detail: 'queue missing', ok: false },
				consent: { ok: true },
				load: { ok: true },
				runtime: { detail: 'stub never replaced', ok: false },
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
			consoleErrors: ['boom'],
			loader: {
				contentType: 'text/html',
				status: 500,
				url: 'https://www.clarity.ms/tag/c15tfake00',
			},
			ok: false,
			phases: {
				bootstrap: { detail: 'queue seeded', ok: true },
				load: { detail: 'loader responded with HTTP 500', ok: false },
			},
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
			consoleErrors: errors,
			loader: {
				status: 500,
				url: 'https://evil.example/`payload`',
			},
			ok: false,
			phases: {
				load: {
					detail: 'loader said `<img src=x onerror=alert(1)>`',
					ok: false,
				},
			},
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
		label: 'PostHog',
		ok: false,
		packageSubpath: 'posthog',
		phases: { load: { detail: 'timeout', ok: false } },
		vendor: 'posthog',
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
				body: existingBody,
				number: 42,
				title: buildMonitorIssueTitle('posthog'),
			},
		]);

		expect(plan.create).toHaveLength(0);
		expect(plan.update).toHaveLength(0);
		expect(plan.close).toHaveLength(0);
	});

	it('updates the issue when the failure signature changes', () => {
		const previous = makeResult({
			ok: false,
			phases: { runtime: { ok: false } },
			vendor: 'posthog',
		});
		const existingBody = buildMonitorIssueBody(
			previous,
			makeReport([previous])
		);
		const plan = planMonitorIssueActions(makeReport([failing]), [
			{
				body: existingBody,
				number: 42,
				title: buildMonitorIssueTitle('posthog'),
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
			ok: true,
			skipReason: 'edge-injected',
			skipped: true,
			vendor: 'cloudflare-zaraz',
		});
		const plan = planMonitorIssueActions(makeReport([skipped]), [
			{ number: 1, title: 'Unrelated issue' },
		]);

		expect(plan.create).toHaveLength(0);
		expect(plan.update).toHaveLength(0);
		expect(plan.close).toHaveLength(0);
	});
});
