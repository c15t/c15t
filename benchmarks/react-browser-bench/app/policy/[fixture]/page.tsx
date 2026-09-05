import { policyBenchFixtures } from '@c15t/benchmarking/policy-fixtures';
import type { PolicyBenchFixtureName } from '@c15t/benchmarking/policy-fixtures';
import { notFound } from 'next/navigation';

import { PolicyBenchmarkPage } from '../../_bench/policy-page';
import type { PolicyBenchScenario } from '../../_bench/policy-state';

const scenarios = new Set<PolicyBenchScenario>([
	'policy-fresh',
	'policy-reject',
	'policy-notice',
	'policy-none',
	'policy-repeat',
]);

const PolicyFixturePage = async ({
	params,
	searchParams,
}: {
	params: Promise<{ fixture: string }>;
	searchParams?: Promise<{ scenario?: string | string[] }>;
}) => {
	const { fixture } = await params;
	const resolvedSearchParams = await searchParams;
	const scenarioParam = resolvedSearchParams?.scenario;
	const scenario = (
		Array.isArray(scenarioParam) ? scenarioParam[0] : scenarioParam
	) as PolicyBenchScenario | undefined;
	if (
		!Object.hasOwn(policyBenchFixtures, fixture) ||
		!scenario ||
		!scenarios.has(scenario)
	) {
		notFound();
	}

	return (
		<PolicyBenchmarkPage
			fixture={fixture as PolicyBenchFixtureName}
			scenario={scenario}
		/>
	);
};

export default PolicyFixturePage;
