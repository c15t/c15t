import {
	type CssLayerSurface,
	CssLayerV3ScenarioRenderer,
} from '@c15t/benchmarking/css-layer-v3-runtime';
import { notFound } from 'next/navigation';

type V3Surface = CssLayerSurface | 'widget';

const VALID_SURFACES = new Set<V3Surface>(['banner', 'dialog', 'widget']);

export default async function V3MatrixScenarioPage({
	params,
}: {
	params: Promise<{ surface: string }>;
}) {
	const resolvedParams = await params;

	if (!VALID_SURFACES.has(resolvedParams.surface as V3Surface)) {
		notFound();
	}

	return (
		<CssLayerV3ScenarioRenderer
			environmentId="tw4"
			environmentLabel="Preview shell"
			surface={resolvedParams.surface as V3Surface}
		/>
	);
}
