import type { AxeResults, NodeResult, Result, RunOptions } from 'axe-core';
import axe from 'axe-core';
import { expect } from 'storybook/test';

export type A11yViolation = {
	id: string;
	impact: Result['impact'];
	help: string;
	helpUrl: string;
	nodes: ReadonlyArray<{
		target: readonly string[];
		failureSummary?: string;
		html: string;
	}>;
};

export type A11yConfig = {
	/**
	 * Rule IDs to ignore. Use sparingly — exclusions must have a justification
	 * recorded in the test or a TODO comment.
	 */
	disableRules?: readonly string[];
	/** Tags to include. Default: wcag2a, wcag2aa, wcag21a, wcag21aa, best-practice */
	tags?: readonly string[];
	/** Maximum allowed violations. Default 0. */
	maxViolations?: number;
};

const DEFAULT_TAGS = [
	'wcag2a',
	'wcag2aa',
	'wcag21a',
	'wcag21aa',
	'best-practice',
] as const;

function normalizeNode(n: NodeResult): A11yViolation['nodes'][number] {
	return {
		target: n.target.map(String),
		failureSummary: n.failureSummary,
		html: n.html,
	};
}

export async function runAxe(
	target: Element | Document = document,
	config: A11yConfig = {}
): Promise<A11yViolation[]> {
	const runOptions: RunOptions = {
		runOnly: { type: 'tag', values: [...(config.tags ?? DEFAULT_TAGS)] },
		rules: Object.fromEntries(
			(config.disableRules ?? []).map((id) => [id, { enabled: false }])
		),
	};

	const results: AxeResults = await axe.run(
		target as Parameters<typeof axe.run>[0],
		runOptions
	);

	return results.violations.map((v) => ({
		id: v.id,
		impact: v.impact,
		help: v.help,
		helpUrl: v.helpUrl,
		nodes: v.nodes.map(normalizeNode),
	}));
}

/**
 * Assert zero a11y violations for the given target. Throws with a readable
 * summary of violations otherwise.
 */
export async function assertNoA11yViolations(
	target: Element | Document = document,
	config: A11yConfig = {}
): Promise<void> {
	const violations = await runAxe(target, config);
	const threshold = config.maxViolations ?? 0;
	if (violations.length <= threshold) return;
	const summary = violations
		.map(
			(v) =>
				`  [${v.impact ?? 'unknown'}] ${v.id}: ${v.help}\n    ${v.nodes
					.map((n) => n.target.join(','))
					.join('; ')}`
		)
		.join('\n');
	expect(
		violations.length,
		`axe reported ${violations.length} violation(s):\n${summary}`
	).toBeLessThanOrEqual(threshold);
}
