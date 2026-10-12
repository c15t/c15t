import { CssLayerScenarioRenderer } from '@c15t/benchmarking/css-layer-runtime';
import type { CssLayerSurface } from '@c15t/benchmarking/css-layer-runtime';
import { notFound } from 'next/navigation';

type Surface = CssLayerSurface | 'widget';

const VALID_SURFACES = new Set<Surface>(['banner', 'dialog', 'widget']);

const MatrixScenarioPage = async ({
	params,
}: {
	params: Promise<{ surface: string }>;
}) => {
	const resolvedParams = await params;

	if (!VALID_SURFACES.has(resolvedParams.surface as Surface)) {
		notFound();
	}

	return (
		<CssLayerScenarioRenderer
			environmentId="tw3"
			environmentLabel="Tailwind CSS 3"
			surface={resolvedParams.surface as Surface}
		/>
	);
};

export default MatrixScenarioPage;
