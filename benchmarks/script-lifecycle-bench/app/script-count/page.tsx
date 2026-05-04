import {
	normalizeCount,
	normalizeVersion,
	type ScriptCountVersion,
} from './_components/fixtures';
import { V2ScriptCountPage } from './_components/v2-page';
import { V3ScriptCountPage } from './_components/v3-page';

export default async function ScriptCountPage({
	searchParams,
}: {
	searchParams?: Promise<{
		count?: string | string[];
		version?: string | string[];
	}>;
}) {
	const resolvedSearchParams = await searchParams;
	const count = normalizeCount(resolvedSearchParams?.count);
	const version: ScriptCountVersion = normalizeVersion(
		resolvedSearchParams?.version
	);

	return version === 'v3' ? (
		<V3ScriptCountPage count={count} />
	) : (
		<V2ScriptCountPage count={count} />
	);
}
