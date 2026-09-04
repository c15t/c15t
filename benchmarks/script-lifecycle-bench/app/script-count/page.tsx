import { ScriptCountBenchmark } from './_components/benchmark';
import { normalizeCount } from './_components/fixtures';

const ScriptCountPage = async ({
	searchParams,
}: {
	searchParams?: Promise<{
		count?: string | string[];
	}>;
}) => {
	const resolvedSearchParams = await searchParams;
	const count = normalizeCount(resolvedSearchParams?.count);

	return <ScriptCountBenchmark count={count} />;
};

export default ScriptCountPage;
