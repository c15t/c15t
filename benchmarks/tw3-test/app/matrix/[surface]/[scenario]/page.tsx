import {
	CssLayerScenarioRenderer,
	type CssLayerSurface,
	getCssLayerScenario,
} from '@c15t/benchmarking';
import { notFound } from 'next/navigation';

const VALID_SURFACES = new Set<CssLayerSurface>(['banner', 'dialog']);

export default async function MatrixScenarioPage({
	params,
	searchParams,
}: {
	params: Promise<{ scenario: string; surface: string }>;
	searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
	const resolvedParams = await params;
	const resolvedSearchParams = searchParams ? await searchParams : undefined;

	if (!VALID_SURFACES.has(resolvedParams.surface as CssLayerSurface)) {
		notFound();
	}

	const scenario = getCssLayerScenario(
		resolvedParams.surface as CssLayerSurface,
		resolvedParams.scenario
	);

	if (!scenario) {
		notFound();
	}

	return (
		<CssLayerScenarioRenderer
			environmentId="tw3"
			environmentLabel="Tailwind CSS 3"
			isPreview={resolvedSearchParams?.preview != null}
			scenario={scenario}
		/>
	);
}
