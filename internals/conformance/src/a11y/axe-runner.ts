import type { AxeResults, NodeResult, Result, RunOptions } from 'axe-core';
import axe from 'axe-core';
import { expect } from 'storybook/test';

export interface A11yViolation {
	id: string;
	impact: Result['impact'];
	help: string;
	helpUrl: string;
	nodes: readonly {
		target: readonly string[];
		failureSummary?: string;
		html: string;
	}[];
}

export interface A11yConfig {
	/**
	 * Rule IDs to ignore. Use sparingly — exclusions must have a justification
	 * recorded in the test or a TODO comment.
	 */
	disableRules?: readonly string[];
	/** Tags to include. Default: wcag2a, wcag2aa, wcag21a, wcag21aa, best-practice */
	tags?: readonly string[];
	/** Maximum allowed violations. Default 0. */
	maxViolations?: number;
}

const DEFAULT_TAGS = [
	'wcag2a',
	'wcag2aa',
	'wcag21a',
	'wcag21aa',
	'best-practice',
] as const;

const normalizeNode = function normalizeNode(
	n: NodeResult
): A11yViolation['nodes'][number] {
	return {
		failureSummary: n.failureSummary,
		html: n.html,
		target: n.target.map(String),
	};
};

export const runAxe = async function runAxe(
	target: Element | Document = document,
	config: A11yConfig = {}
): Promise<A11yViolation[]> {
	const runOptions: RunOptions = {
		rules: Object.fromEntries(
			(config.disableRules ?? []).map((id) => [id, { enabled: false }])
		),
		runOnly: { type: 'tag', values: [...(config.tags ?? DEFAULT_TAGS)] },
	};

	const results: AxeResults = await axe.run(
		target as Parameters<typeof axe.run>[0],
		runOptions
	);

	return results.violations.map((v) => ({
		help: v.help,
		helpUrl: v.helpUrl,
		id: v.id,
		impact: v.impact,
		nodes: v.nodes.map(normalizeNode),
	}));
};

/**
 * Assert zero a11y violations for the given target. Throws with a readable
 * summary of violations otherwise.
 */
export const assertNoA11yViolations = async function assertNoA11yViolations(
	target: Element | Document = document,
	config: A11yConfig = {}
): Promise<void> {
	const violations = await runAxe(target, config);
	const threshold = config.maxViolations ?? 0;
	if (violations.length <= threshold) {
		return;
	}
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
};
