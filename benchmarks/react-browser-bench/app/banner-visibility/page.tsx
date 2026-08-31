import { normalizeVersion } from './_components/state';
import type { BannerVisibilityVersion } from './_components/state';
import { V2BannerVisibilityPage } from './_components/v2-page';
import { V3BannerVisibilityPage } from './_components/v3-page';

const BannerVisibilityPage = async ({
	searchParams,
}: {
	searchParams?: Promise<{ version?: string | string[] }>;
}) => {
	const resolvedSearchParams = await searchParams;
	const version: BannerVisibilityVersion = normalizeVersion(
		resolvedSearchParams?.version
	);

	return version === 'v3' ? (
		<V3BannerVisibilityPage />
	) : (
		<V2BannerVisibilityPage />
	);
};

export default BannerVisibilityPage;
